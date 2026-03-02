import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLLMClient, generateAndValidate } from "@/lib/llm-client";
import {
    BRDSchema,
    PRDSchema,
    runQualityGate,
    type BRD,
    type PRD,
} from "@/lib/schemas";
import { z } from "zod";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;
    const supabase = await createClient();
    const sb = (supabase as any);

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load document with project
    const { data: docRes, error: docErr } = await sb
        .from("documents")
        .select("*, projects(*)")
        .eq("id", documentId)
        .single();
    const doc = docRes;

    if (docErr || !doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Load context items
    const contextItemIds = Array.isArray(doc.context_item_ids) ? doc.context_item_ids : [];
    let contextText = "";
    if (contextItemIds.length > 0) {
        const { data: ctxItemsRes } = await sb
            .from("context_items")
            .select("type, title, content")
            .in("id", contextItemIds);
        const ctxItems = (ctxItemsRes as any[]) ?? [];
        contextText = ctxItems
            ?.map((c) => `[${c.type.toUpperCase()}] ${c.title}\n${c.content}`)
            .join("\n\n---\n\n") ?? "";
    }

    const project = doc.projects as Record<string, unknown>;
    const projectContext = `
Project: ${project?.name}
Client: ${project?.client_name || "N/A"}
Domain: ${project?.domain || "N/A"}
Tech Stack: ${Array.isArray(project?.tech_stack) ? (project.tech_stack as string[]).join(", ") : "N/A"}
Release Cadence: ${project?.release_cadence || "N/A"}
Story Format: ${project?.story_format || "gherkin"}
Definition of Done: ${project?.definition_of_done || "N/A"}
`.trim();

    const llm = getLLMClient();
    let generatedContent: BRD | PRD;

    try {
        if (doc.type === "BRD") {
            const systemPrompt = `You are an expert Business Analyst. Generate a comprehensive, structured BRD in valid JSON format.
The JSON must exactly match the schema provided. Be thorough and specific — avoid vague language.
Return ONLY raw JSON. No markdown, no code blocks.

PROJECT CONTEXT:
${projectContext}

${contextText ? `REFERENCE CONTEXT:\n${contextText}` : ""}`;

            const userPrompt = `Generate a complete BRD for: ${doc.seed_input}

Title of document: ${doc.title}
${doc.target_release ? `Target Release: ${doc.target_release}` : ""}

Return JSON matching this structure:
{
  "title": "string",
  "version": "1.0",
  "status": "draft",
  "executive_summary": "string",
  "problem_statement": "string",
  "objectives": ["string"],
  "scope": { "in_scope": ["string"], "out_of_scope": ["string"] },
  "stakeholders": [{ "name": "string", "role": "string", "interest": "string" }],
  "business_requirements": [{ "id": "BR-001", "title": "string", "description": "string", "priority": "high|medium|low|critical", "rationale": "string" }],
  "constraints": [{ "type": "string", "description": "string" }],
  "assumptions": ["string"],
  "risks": [{ "description": "string", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigation": "string" }],
  "success_metrics": [{ "metric": "string", "target": "string", "measurement": "string" }],
  "glossary": [{ "term": "string", "definition": "string" }]
}`;

            const result = await generateAndValidate(llm, [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ], BRDSchema);

            generatedContent = result.data;
        } else {
            const systemPrompt = `You are an expert Product Manager. Generate a comprehensive, structured PRD in valid JSON format.
The JSON must exactly match the schema provided. ALWAYS include non_functional_requirements — this is mandatory.
Return ONLY raw JSON. No markdown, no code blocks.

PROJECT CONTEXT:
${projectContext}

${contextText ? `REFERENCE CONTEXT:\n${contextText}` : ""}`;

            const userPrompt = `Generate a complete PRD for: ${doc.seed_input}

Title: ${doc.title}
${doc.target_release ? `Target Release: ${doc.target_release}` : ""}

Return JSON matching this structure:
{
  "title": "string",
  "version": "1.0",
  "status": "draft",
  "product_vision": "string",
  "problem_statement": "string",
  "target_users": [{ "persona": "string", "description": "string", "needs": ["string"] }],
  "success_metrics": [{ "metric": "string", "target": "string", "measurement": "string" }],
  "functional_requirements": [{ "id": "FR-001", "feature": "string", "description": "string", "priority": "must-have|high|medium|low", "acceptance_criteria_summary": "string" }],
  "non_functional_requirements": [{ "category": "Performance|Security|Scalability|Accessibility|Reliability", "requirement": "string", "target": "string" }],
  "technical_considerations": ["string"],
  "dependencies": [{ "name": "string", "type": "string", "description": "string" }],
  "release_plan": { "target_date": "string", "milestones": [{ "name": "string", "description": "string", "target_date": "string" }] },
  "out_of_scope": ["string"],
  "open_questions": [{ "question": "string", "owner": "string", "status": "open" }]
}`;

            const result = await generateAndValidate(llm, [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ], PRDSchema);

            generatedContent = result.data;
        }
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AI generation failed" },
            { status: 500 }
        );
    }

    // Quality gate check
    const gate = runQualityGate({
        prd: doc.type === "PRD" ? generatedContent : undefined,
    });

    // Get current max version
    const { data: versions } = await sb
        .from("document_versions")
        .select("version_number")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false })
        .limit(1);
    const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

    // Save version
    const { error: versionErr } = await sb.from("document_versions").insert({
        document_id: documentId,
        version_number: nextVersion,
        content_json: generatedContent as unknown as Record<string, unknown>,
        change_summary: `Generated ${doc.type} v${nextVersion}`,
        created_by: user.id,
    });

    if (versionErr) {
        return NextResponse.json({ error: "Failed to save version" }, { status: 500 });
    }

    // Save chat message
    await sb.from("chat_messages").insert({
        document_id: documentId,
        role: "assistant",
        content_text: `✅ Generated ${doc.type} v${nextVersion}. ${gate.errors.length > 0 ? `⚠️ Quality gate: ${gate.errors.length} issues found.` : "Quality gate passed."}`,
        metadata: { action: "generate_document", version_number: nextVersion, quality_gate: gate },
    });

    return NextResponse.json({
        success: true,
        version_number: nextVersion,
        content: generatedContent,
        quality_gate: gate,
    });
}
