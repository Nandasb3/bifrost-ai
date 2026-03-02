import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMarkdownExport } from "@/lib/export-generators";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Create queued job
    const { data: job, error: jobErr } = await supabase
        .from("export_jobs")
        .insert({
            document_id: documentId,
            type: "markdown",
            status: "running",
            created_by: user.id,
        })
        .select()
        .single();

    if (jobErr) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

    try {
        const content = await generateMarkdownExport(supabase, documentId);

        await supabase
            .from("export_jobs")
            .update({ status: "completed", artifact_content: content, completed_at: new Date().toISOString() })
            .eq("id", job.id);

        return NextResponse.json({ success: true, job_id: job.id, content });
    } catch (err: unknown) {
        await supabase
            .from("export_jobs")
            .update({ status: "failed", error_text: err instanceof Error ? err.message : "Unknown error" })
            .eq("id", job.id);

        return NextResponse.json({ error: err instanceof Error ? err.message : "Export failed" }, { status: 500 });
    }
}
