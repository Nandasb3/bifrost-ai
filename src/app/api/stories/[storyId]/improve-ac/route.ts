import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserLLMClient, generateAndValidate } from "@/lib/llm-client";
import { z } from "zod";

const ImprovedACSchema = z.array(
    z.object({
        type: z.enum(["functional", "validation", "error", "edge", "nfr"]),
        given: z.string(),
        when: z.string(),
        then: z.string(),
        notes: z.string().optional(),
    })
);

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ storyId: string }> }
) {
    const { storyId } = await params;
    const supabase = await createClient();
    const sb = (supabase as any);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storyRes } = await sb
        .from("stories")
        .select("*, acceptance_criteria(*)")
        .eq("id", storyId)
        .single();
    const story = storyRes;

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const currentACs = story.acceptance_criteria ?? [];
    const llm = await getUserLLMClient(sb, user.id);

    try {
        const result = await generateAndValidate(
            llm,
            [
                {
                    role: "system",
                    content: `You are an expert QA analyst. Improve and augment acceptance criteria for user stories.
Ensure minimum 3 ACs covering: functional, validation/edge, error handling.
Return improved + additional ACs as a JSON array. Be specific, no vague words.
Return ONLY the JSON array.`,
                },
                {
                    role: "user",
                    content: `STORY: ${story.title}
STORY STATEMENT: ${story.story_statement || "N/A"}
DESCRIPTION: ${story.description || "N/A"}

CURRENT ACCEPTANCE CRITERIA (${currentACs.length}):
${currentACs.map((ac: Record<string, string>, i: number) => `${i + 1}. [${ac.type}] Given: ${ac.given} | When: ${ac.when} | Then: ${ac.then}`).join("\n")}

Improve and add missing ACs. Return ALL acceptance criteria (existing + improved + new).
Ensure at least: 1 functional, 1 validation/edge, 1 error.
Return JSON array:
[{ "type": "functional|validation|error|edge|nfr", "given": "", "when": "", "then": "", "notes": "" }]`,
                },
            ],
            ImprovedACSchema
        );

        const improvedACs = result.data;

        // Replace all ACs for this story
        await sb.from("acceptance_criteria").delete().eq("story_id", storyId);
        await sb.from("acceptance_criteria").insert(
            improvedACs.map((ac, idx) => ({
                story_id: storyId,
                type: ac.type,
                given: ac.given,
                when: ac.when,
                then: ac.then,
                notes: ac.notes ?? null,
                sort_order: idx,
            }))
        );

        return NextResponse.json({ success: true, count: improvedACs.length });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to improve AC" },
            { status: 500 }
        );
    }
}
