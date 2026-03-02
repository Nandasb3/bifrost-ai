"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ChevronRight, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ documentId?: string }>;
}

interface JiraIssue {
    summary: string;
    issuetype: { name: string };
    priority: { name: string };
    description?: string;
}

interface JiraPayload {
    projects: Array<{
        key: string;
        name: string;
        issues: JiraIssue[];
    }>;
}

interface ValidationResult {
    valid: boolean;
    warnings: string[];
    epicCount: number;
    storyCount: number;
}

function validateJiraPayload(payload: JiraPayload): ValidationResult {
    const warnings: string[] = [];
    let epicCount = 0;
    let storyCount = 0;

    for (const proj of payload.projects ?? []) {
        if (!proj.key) warnings.push("Project is missing a key");
        for (const issue of proj.issues ?? []) {
            if (issue.issuetype?.name === "Epic") epicCount++;
            if (issue.issuetype?.name === "Story") storyCount++;
            if (!issue.summary) warnings.push("An issue is missing a summary");
            if ((issue.description?.length ?? 0) > 32768) {
                warnings.push(`Issue "${issue.summary}" description exceeds Jira 32KB limit`);
            }
        }
    }

    if (epicCount === 0) warnings.push("No epics found — generate epics first");
    if (storyCount === 0) warnings.push("No stories found — generate stories first");

    return { valid: warnings.length === 0, warnings, epicCount, storyCount };
}

export default function JiraExportPage({ params: paramsPromise, searchParams: spPromise }: Props) {
    const [projectId, setProjectId] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [payload, setPayload] = useState<JiraPayload | null>(null);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        Promise.all([paramsPromise, spPromise]).then(([{ projectId: pid }, { documentId: did }]) => {
            setProjectId(pid);
            setDocumentId(did ?? "");
            if (did) loadPreview(did);
        });
    }, []);

    const loadPreview = async (docId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/documents/${docId}/export-jira`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPayload(data.content);
            setValidation(validateJiraPayload(data.content));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load preview");
        } finally {
            setLoading(false);
        }
    };

    const downloadJSON = () => {
        if (!payload) return;
        const content = JSON.stringify(payload, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "jira-import.json";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Jira JSON downloaded!");
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href={`/projects/${projectId}/exports?documentId=${documentId}`} className="hover:text-foreground">
                    Exports
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Jira JSON Preview</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Jira JSON Preview</h1>
                    <p className="text-muted-foreground mt-1">Review and validate before import</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-white/10"
                        onClick={() => loadPreview(documentId)}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </Button>
                    <Button
                        className="gradient-primary shadow-lg shadow-primary/20"
                        onClick={downloadJSON}
                        disabled={!payload}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                    </Button>
                </div>
            </div>

            {/* Validation */}
            {validation && (
                <div className={`glass-card rounded-xl p-4 ${validation.valid ? "border-emerald-500/20" : "border-amber-500/20"}`}>
                    <div className="flex items-center gap-2 mb-3">
                        {validation.valid ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        )}
                        <span className={`font-semibold ${validation.valid ? "text-emerald-400" : "text-amber-400"}`}>
                            {validation.valid ? "Valid — Ready to import" : `${validation.warnings.length} validation warning(s)`}
                        </span>
                        <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
                            <span><strong>{validation.epicCount}</strong> Epics</span>
                            <span><strong>{validation.storyCount}</strong> Stories</span>
                        </div>
                    </div>
                    {validation.warnings.length > 0 && (
                        <ul className="space-y-1">
                            {validation.warnings.map((w, i) => (
                                <li key={i} className="text-sm text-amber-400/80 flex gap-2 items-start">
                                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Issue preview */}
            {loading ? (
                <div className="glass-card rounded-xl p-12 text-center">
                    <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Generating Jira payload...</p>
                </div>
            ) : payload?.projects?.[0]?.issues ? (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Issues ({payload.projects[0].issues.length})
                    </h2>
                    <ScrollArea className="h-[60vh] scrollbar-thin">
                        <div className="space-y-2 pr-2">
                            {payload.projects[0].issues.map((issue, i) => (
                                <div key={i} className="glass-card rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                            variant="secondary"
                                            className={
                                                issue.issuetype.name === "Epic"
                                                    ? "bg-purple-500/15 text-purple-400"
                                                    : "bg-blue-500/15 text-blue-400"
                                            }
                                        >
                                            {issue.issuetype.name}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-white/10 text-muted-foreground text-xs">
                                            {issue.priority.name}
                                        </Badge>
                                    </div>
                                    <p className="font-medium text-sm">{issue.summary}</p>
                                    {issue.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description.slice(0, 150)}...</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            ) : !loading && (
                <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
                    <p>No preview available. Generate epics and stories first.</p>
                </div>
            )}

            {/* Raw JSON toggle */}
            {payload && (
                <details className="glass-card rounded-xl">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        View Raw JSON
                    </summary>
                    <ScrollArea className="h-64">
                        <pre className="p-4 text-xs text-foreground/70 overflow-auto">
                            {JSON.stringify(payload, null, 2)}
                        </pre>
                    </ScrollArea>
                </details>
            )}
        </div>
    );
}
