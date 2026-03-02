import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLLMClient, generateAndValidate } from "@/lib/llm-client";
import { StoriesArraySchema, runQualityGate, type Story } from "@/lib/schemas";
import { z } from "zod";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load epics
    const { data: epics } = await supabase
        .from("epics")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

    if (!epics || epics.length === 0) {
        return NextResponse.json(
            { error: "No epics found. Generate epics first." },
            { status: 400 }
        );
    }

    const { data: doc } = await supabase
        .from("documents")
        .select("*, projects(name, domain, story_format, definition_of_done)")
        .eq("id", documentId)
        .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const project = doc.projects as Record<string, unknown>;

    const llm = getLLMClient();
    const allStories: Array<Story & { epicId: string }> = [];
    let totalErrors = 0;

    // Generate stories for each epic (process 2 at a time to avoid rate limits)
    for (let i = 0; i < epics.length; i += 2) {
        const batch = epics.slice(i, i + 2);
        const batchResults = await Promise.allSettled(
            batch.map(async (epic) => {
                const EpicStoriesSchema = StoriesArraySchema;
                const result = await generateAndValidate(
                    llm,
                    [
                        {
                            role: "system",
                            content: `You are an expert Agile coach and Business Analyst who writes high-quality user stories with Gherkin acceptance criteria.
For each story, generate EXACTLY 3+ acceptance criteria covering: functional behavior, validation/edge case, error handling.
NEVER use vague words like "user-friendly", "fast", "intuitive".
Return ONLY a JSON array of story objects. No wrapping key.
Story format: ${project?.story_format ?? "gherkin"}`,
                        },
                        {
                            role: "user",
                            content: `Generate 3-5 user stories with acceptance criteria for this epic:

EPIC: ${epic.title}
Description: ${epic.description}
Business Value: ${epic.business_value}
Priority: ${epic.priority}

Project: ${project?.name ?? "N/A"}, Domain: ${project?.domain ?? "N/A"}
Definition of Done: ${project?.definition_of_done ?? "N/A"}

Return JSON array:
[
  {
    "title": "string",
    "story_statement": "As a [persona], I want to [action], so that [benefit]",
    "description": "string",
    "business_rules": ["string"],
    "priority": "low|medium|high|critical",
    "dependencies": ["string"],
    "acceptance_criteria": [
      {
        "type": "functional|validation|error|edge|nfr",
        "given": "string (context/precondition)",
        "when": "string (action)",
        "then": "string (observable outcome)"
      }
    ]
  }
]

Rules:
1. Each story MUST have at least 3 acceptance criteria: one functional, one validation/edge, one error
2. Gherkin format: Given/When/Then — be specific, not vague
3. Story statements follow "As a [user], I want [goal], so that [reason]"`,
                        },
                    ],
                    EpicStoriesSchema,
                    { maxTokens: 5000 }
                );
                return { epicId: epic.id, stories: result.data };
            })
        );

        for (const result of batchResults) {
            if (result.status === "fulfilled") {
                result.value.stories.forEach((s) =>
                    allStories.push({ ...s, epicId: result.value.epicId })
                );
            } else {
                totalErrors++;
                console.error("Story generation error:", result.reason);
            }
        }
    }

    if (allStories.length === 0) {
        return NextResponse.json({ error: "Failed to generate any stories" }, { status: 500 });
    }

    // Quality gate
    const gate = runQualityGate({ stories: allStories });

    // Clear existing stories/ACs for this document's epics
    const epicIds = epics.map((e) => e.id);
    const { data: existingStories } = await supabase
        .from("stories")
        .select("id")
        .in("epic_id", epicIds);
    if (existingStories && existingStories.length > 0) {
        const storyIds = existingStories.map((s) => s.id);
        await supabase.from("acceptance_criteria").delete().in("story_id", storyIds);
        await supabase.from("stories").delete().in("id", storyIds);
    }

    // Insert stories and ACs
    for (const story of allStories) {
        const { data: insertedStory, error: storyErr } = await supabase
            .from("stories")
            .insert({
                epic_id: story.epicId,
                title: story.title,
                story_statement: story.story_statement,
                description: story.description,
                business_rules: story.business_rules,
                priority: story.priority,
                dependencies: story.dependencies,
                status: "draft",
            })
            .select("id")
            .single();

        if (storyErr || !insertedStory) continue;

        if (story.acceptance_criteria && story.acceptance_criteria.length > 0) {
            await supabase.from("acceptance_criteria").insert(
                story.acceptance_criteria.map((ac, idx) => ({
                    story_id: insertedStory.id,
                    type: ac.type,
                    given: ac.given,
                    when: ac.when,
                    then: ac.then,
                    notes: ac.notes ?? null,
                    sort_order: idx,
                }))
            );
        }
    }

    await supabase.from("chat_messages").insert({
        document_id: documentId,
        role: "assistant",
        content_text: `✅ Generated ${allStories.length} stories with acceptance criteria across ${epics.length} epics.${gate.errors.length > 0 ? ` ⚠️ ${gate.errors.length} quality issues.` : " Quality gate passed."}`,
        metadata: { action: "generate_stories", count: allStories.length, quality_gate: gate },
    });

    return NextResponse.json({
        success: true,
        story_count: allStories.length,
        quality_gate: gate,
        errors: totalErrors > 0 ? `${totalErrors} epics failed generation` : null,
    });
}
