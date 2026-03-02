import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLLMClient, generateAndValidate } from "@/lib/llm-client";
import { EpicsArraySchema, type Epic } from "@/lib/schemas";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;
    const supabase = await createClient();
    const sb = (supabase as any);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load current PRD content
    const { data: versionRes } = await sb
        .from("document_versions")
        .select("content_json, version_number")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
    const version = versionRes;

    if (!version) {
        return NextResponse.json(
            { error: "No document content found. Generate the document first." },
            { status: 400 }
        );
    }

    const { data: docRes } = await sb
        .from("documents")
        .select("*, projects(name, domain, tech_stack, story_format)")
        .eq("id", documentId)
        .single();
    const doc = docRes;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const project = doc.projects as Record<string, unknown>;

    const llm = getLLMClient();

    let epics: Epic[];
    try {
        const result = await generateAndValidate(
            llm,
            [
                {
                    role: "system",
                    content: `You are an expert Product Manager who creates well-structured epics from PRDs.
Generate a comprehensive list of epics for the given document content.
Each epic should be a cohesive business capability or feature area.
Return ONLY a JSON array of epic objects. No wrapping object, just the array.`,
                },
                {
                    role: "user",
                    content: `Based on this ${doc.type} for ${project?.name ?? "the project"} in the ${project?.domain ?? "technology"} domain, generate 4-8 epics.

DOCUMENT CONTENT:
${JSON.stringify(version.content_json, null, 2).slice(0, 6000)}

Return a JSON array where each epic matches:
[
  {
    "title": "string",
    "description": "string (2-4 sentences)",
    "business_value": "string (clear business outcome)",
    "priority": "low|medium|high|critical",
    "target_release": "string or omit",
    "dependencies": ["string array of other epic titles this depends on"]
  }
]`,
                },
            ],
            EpicsArraySchema,
            { maxTokens: 4000 }
        );
        epics = result.data;
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Epic generation failed" },
            { status: 500 }
        );
    }

    // Clear old epics for this document and insert new ones
    await sb.from("epics").delete().eq("document_id", documentId);

    const epicInserts = epics.map((epic, idx) => ({
        document_id: documentId,
        title: epic.title,
        description: epic.description,
        business_value: epic.business_value,
        priority: epic.priority,
        target_release: epic.target_release ?? null,
        dependencies: epic.dependencies,
        sort_order: idx,
    }));

    const { data: insertedEpics, error: insertErr } = await sb
        .from("epics")
        .insert(epicInserts)
        .select();

    if (insertErr) {
        return NextResponse.json({ error: "Failed to save epics" }, { status: 500 });
    }

    // Chat message
    await sb.from("chat_messages").insert({
        document_id: documentId,
        role: "assistant",
        content_text: `✅ Generated ${epics.length} epics successfully.`,
        metadata: { action: "generate_epics", count: epics.length },
    });

    return NextResponse.json({ success: true, epics: insertedEpics });
}
