import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLLMClient } from "@/lib/llm-client";
import { RefinementPatchSchema } from "@/lib/schemas";
import { z } from "zod";
import { applyPatch } from "@/lib/patch";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;
    const supabase = await createClient();
    const sb = (supabase as any);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const instruction = body.instruction as string;
    if (!instruction?.trim()) {
        return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }

    // Load latest version
    const { data: latestVersionRes } = await sb
        .from("document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
    const latestVersion = latestVersionRes;

    if (!latestVersion) {
        return NextResponse.json(
            { error: "No document content found. Generate the document first." },
            { status: 400 }
        );
    }

    // Save user message
    await sb.from("chat_messages").insert({
        document_id: documentId,
        role: "user",
        content_text: instruction,
        metadata: { action: "refine" },
    });

    const llm = getLLMClient();

    let patch: z.infer<typeof RefinementPatchSchema>;
    try {
        const raw = await llm.completeJSON<unknown>([
            {
                role: "system",
                content: `You are a precise document editor. You receive a JSON document and a refinement instruction.
You MUST return a targeted patch — only change what was asked. Return minimal changes.
Return ONLY a JSON object with this structure (no markdown):
{
  "summary": "Brief description of changes made",
  "operations": [
    { "op": "update", "path": "dot.notation.path", "value": <new_value>, "reason": "why" },
    { "op": "append", "path": "dot.notation.path.to.array", "value": <item_to_append>, "reason": "why" },
    { "op": "remove", "path": "dot.notation.path", "reason": "why" }
  ]
}`,
            },
            {
                role: "user",
                content: `CURRENT DOCUMENT (v${latestVersion.version_number}):
${JSON.stringify(latestVersion.content_json, null, 2).slice(0, 6000)}

REFINEMENT INSTRUCTION:
${instruction}

Return the minimal patch operations needed. Only change what was explicitly asked.`,
            },
        ]);

        const parsed = RefinementPatchSchema.safeParse(raw);
        if (!parsed.success) {
            throw new Error(`Invalid patch: ${parsed.error.message}`);
        }
        patch = parsed.data;
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Refinement failed" },
            { status: 500 }
        );
    }

    // Apply patch to current content
    let updatedContent: unknown;
    try {
        updatedContent = applyPatch(latestVersion.content_json, patch.operations);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: `Failed to apply patch: ${err instanceof Error ? err.message : "unknown"}` },
            { status: 500 }
        );
    }

    // Save new version
    const nextVersion = latestVersion.version_number + 1;
    const { error: versionErr } = await sb.from("document_versions").insert({
        document_id: documentId,
        version_number: nextVersion,
        content_json: updatedContent as Record<string, unknown>,
        change_summary: patch.summary,
        created_by: user.id,
    });

    if (versionErr) {
        return NextResponse.json({ error: "Failed to save updated version" }, { status: 500 });
    }

    // Save assistant message
    await sb.from("chat_messages").insert({
        document_id: documentId,
        role: "assistant",
        content_text: `✅ ${patch.summary} (v${nextVersion})`,
        metadata: { action: "refine", patch, version_number: nextVersion },
    });

    return NextResponse.json({
        success: true,
        version_number: nextVersion,
        patch,
        content: updatedContent,
    });
}
