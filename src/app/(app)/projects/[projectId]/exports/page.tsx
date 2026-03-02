"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Download,
    FileText,
    Table,
    Code,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ documentId?: string }>;
}

interface ExportJob {
    id: string;
    type: "markdown" | "csv" | "jira_json";
    status: "queued" | "running" | "failed" | "completed";
    artifact_content: string | null;
    error_text: string | null;
    created_at: string;
}

interface Document {
    id: string;
    title: string;
    type: string;
}

const EXPORT_TYPES = [
    {
        key: "markdown",
        label: "Markdown Package",
        description: "BRD.md + PRD.md + Epics.md + Stories.md",
        icon: FileText,
        color: "text-blue-400 bg-blue-500/20",
        endpoint: "export-markdown",
        filename: "bifrost-export.md",
        mime: "text/markdown",
    },
    {
        key: "csv",
        label: "CSV Files",
        description: "epics.csv + stories.csv + acceptance_criteria.csv",
        icon: Table,
        color: "text-emerald-400 bg-emerald-500/20",
        endpoint: "export-csv",
        filename: "bifrost-export.json",
        mime: "application/json",
    },
    {
        key: "jira_json",
        label: "Jira JSON",
        description: "Jira Cloud bulk import payload (epics + stories + AC)",
        icon: Code,
        color: "text-purple-400 bg-purple-500/20",
        endpoint: "export-jira",
        filename: "jira-import.json",
        mime: "application/json",
    },
] as const;

const statusIcon = {
    completed: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    running: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
    queued: <Clock className="w-4 h-4 text-muted-foreground" />,
};

export default function ExportsPage({ params: paramsPromise, searchParams: spPromise }: Props) {
    const supabase = createClient();
    const [projectId, setProjectId] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [documents, setDocuments] = useState<Document[]>([]);
    const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
    const [generating, setGenerating] = useState<string | null>(null);
    const [projectName, setProjectName] = useState("");

    useEffect(() => {
        Promise.all([paramsPromise, spPromise]).then(([{ projectId: pid }, { documentId: did }]) => {
            setProjectId(pid);
            setDocumentId(did ?? "");

            supabase.from("projects").select("name").eq("id", pid).single()
                .then(({ data }) => setProjectName(data?.name ?? ""));

            supabase.from("documents").select("id, title, type").eq("project_id", pid)
                .then(({ data }) => setDocuments(data ?? []));

            const docId = did ?? "";
            if (docId) loadJobs(docId);
        });
    }, []);

    const loadJobs = async (docId: string) => {
        const { data } = await supabase
            .from("export_jobs")
            .select("*")
            .eq("document_id", docId)
            .order("created_at", { ascending: false })
            .limit(20);
        setExportJobs(data ?? []);
    };

    const runExport = async (exportType: (typeof EXPORT_TYPES)[number]) => {
        if (!documentId) {
            toast.error("Select a document first");
            return;
        }
        setGenerating(exportType.key);
        try {
            const res = await fetch(`/api/documents/${documentId}/${exportType.endpoint}`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            await loadJobs(documentId);
            toast.success(`${exportType.label} ready!`);

            // Auto-download
            if (data.content) {
                const content =
                    typeof data.content === "string" ? data.content : JSON.stringify(data.content, null, 2);
                downloadFile(content, exportType.filename, exportType.mime);
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setGenerating(null);
        }
    };

    const downloadFile = (content: string, filename: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadJob = (job: ExportJob) => {
        if (!job.artifact_content) return;
        const typeInfo = EXPORT_TYPES.find((t) => t.key === job.type);
        const content =
            typeof job.artifact_content === "string" ? job.artifact_content : JSON.stringify(job.artifact_content, null, 2);
        downloadFile(content, typeInfo?.filename ?? "export.txt", typeInfo?.mime ?? "text/plain");
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href="/projects" className="hover:text-foreground">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">{projectName}</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Exports</span>
            </div>

            <div>
                <h1 className="text-3xl font-bold gradient-text">Export Hub</h1>
                <p className="text-muted-foreground mt-1">Download your documentation in any format</p>
            </div>

            {/* Document selector */}
            <div className="glass-card rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Select Document</div>
                <div className="flex flex-wrap gap-2">
                    {documents.map((doc) => (
                        <button
                            key={doc.id}
                            onClick={() => {
                                setDocumentId(doc.id);
                                loadJobs(doc.id);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${documentId === doc.id
                                    ? "gradient-primary text-white border-transparent shadow-lg shadow-primary/20"
                                    : "border-white/10 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                                }`}
                        >
                            {doc.type}: {doc.title}
                        </button>
                    ))}
                    {documents.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No documents found.{" "}
                            <Link href={`/projects/${projectId}/documents/new?type=PRD`} className="text-primary hover:underline">
                                Create one
                            </Link>
                        </p>
                    )}
                </div>
            </div>

            {/* Export buttons */}
            <div className="grid sm:grid-cols-3 gap-4">
                {EXPORT_TYPES.map((exportType) => (
                    <div key={exportType.key} className="glass-card rounded-xl p-5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${exportType.color}`}>
                            <exportType.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold mb-1">{exportType.label}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{exportType.description}</p>
                        <Button
                            className="w-full gradient-primary shadow-lg shadow-primary/20 text-sm"
                            onClick={() => runExport(exportType)}
                            disabled={!!generating || !documentId}
                        >
                            {generating === exportType.key ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                            ) : (
                                <><Download className="w-4 h-4 mr-2" />Export & Download</>
                            )}
                        </Button>
                    </div>
                ))}
            </div>

            {/* Jira JSON preview link */}
            {documentId && (
                <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">Jira JSON Preview & Validation</div>
                        <div className="text-xs text-muted-foreground">Preview the Jira structure before downloading</div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="border-white/10">
                        <Link href={`/projects/${projectId}/exports/jira?documentId=${documentId}`}>
                            Preview <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            )}

            {/* Export history */}
            {exportJobs.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold mb-3">Export History</h2>
                    <div className="space-y-2">
                        {exportJobs.map((job) => (
                            <div key={job.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                                {statusIcon[job.status]}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{job.type.replace(/_/g, " ").toUpperCase()}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                        {job.error_text && ` · ${job.error_text}`}
                                    </div>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={
                                        job.status === "completed"
                                            ? "bg-emerald-500/15 text-emerald-400"
                                            : job.status === "failed"
                                                ? "bg-red-500/15 text-red-400"
                                                : "bg-amber-500/15 text-amber-400"
                                    }
                                >
                                    {job.status}
                                </Badge>
                                {job.status === "completed" && job.artifact_content && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => downloadJob(job)}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
