/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Zap,
    Layers,
    BookOpen,
    Send,
    ChevronRight,
    ChevronDown,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    RotateCcw,
    Lock,
    Unlock,
    FileText,
    ArrowLeft,
    Download,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { QualityGateResult } from "@/lib/schemas";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content_text: string;
    created_at: string;
    metadata?: Record<string, unknown>;
}

interface DocumentVersion {
    id: string;
    version_number: number;
    content_json: unknown;
    change_summary: string | null;
    created_at: string;
}

interface Epic {
    id: string;
    title: string;
    description: string | null;
    priority: string;
}

interface Story {
    id: string;
    epic_id: string;
    title: string;
    story_statement: string | null;
    status: string;
}

interface DocInfo {
    id: string;
    title: string;
    type: "BRD" | "PRD";
    status: string;
    project_id: string;
    projects: { name: string };
}

interface Props {
    params: Promise<{ projectId: string; documentId: string }>;
}

type ActiveNode =
    | { type: "document" }
    | { type: "epic"; id: string; title: string }
    | { type: "story"; id: string; title: string };

const PIPELINE_STEPS = [
    { key: "generate", label: "Generate Doc", icon: FileText, endpoint: "generate" },
    { key: "epics", label: "Generate Epics", icon: Layers, endpoint: "generate-epics" },
    { key: "stories", label: "Generate Stories + AC", icon: BookOpen, endpoint: "generate-stories" },
];

export default function BuilderPage({ params: paramsPromise }: Props) {
    const supabase = createClient();
    const sb = supabase as any;
    const [projectId, setProjectId] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [doc, setDoc] = useState<DocInfo | null>(null);
    const [latestVersion, setLatestVersion] = useState<DocumentVersion | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [activeNode, setActiveNode] = useState<ActiveNode>({ type: "document" });
    const [generating, setGenerating] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [sending, setSending] = useState(false);
    const [qualityGate, setQualityGate] = useState<QualityGateResult | null>(null);
    const [lockedSections, setLockedSections] = useState<Set<string>>(new Set());
    const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const loadData = useCallback(async (docId: string) => {
        const [versionRes, messagesRes, epicsRes] = await Promise.all([
            sb.from("document_versions").select("*").eq("document_id", docId).order("version_number", { ascending: false }).limit(1).single(),
            sb.from("chat_messages").select("*").eq("document_id", docId).order("created_at", { ascending: true }),
            sb.from("epics").select("*").eq("document_id", docId).order("sort_order"),
        ]);

        if (versionRes.data) setLatestVersion(versionRes.data as DocumentVersion);
        if (messagesRes.data) setMessages(messagesRes.data as Message[]);
        if (epicsRes.data) {
            setEpics(epicsRes.data as Epic[]);
            if ((epicsRes.data as Epic[]).length > 0) {
                const epicIds = (epicsRes.data as Epic[]).map((e) => e.id);
                const { data: storiesData } = await sb.from("stories").select("*").in("epic_id", epicIds).order("sort_order");
                setStories((storiesData as Story[]) ?? []);
            }
        }
    }, [sb]);

    useEffect(() => {
        paramsPromise.then(({ projectId: pid, documentId: did }) => {
            setProjectId(pid);
            setDocumentId(did);

            sb.from("documents").select("*, projects(name)").eq("id", did).single()
                .then(({ data }: { data: DocInfo | null }) => {
                    if (data) setDoc(data);
                });

            loadData(did);
        });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const runPipeline = async (step: (typeof PIPELINE_STEPS)[0]) => {
        setGenerating(step.key);
        const optimisticMsg: Message = {
            id: `opt-${Date.now()}`,
            role: "system",
            content_text: `⏳ Running: ${step.label}...`,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const res = await fetch(
                `/api/documents/${documentId}/${step.endpoint}`,
                { method: "POST" }
            );
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            if (data.quality_gate) setQualityGate(data.quality_gate);

            await loadData(documentId);
            toast.success(`${step.label} completed!`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Generation failed");
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        } finally {
            setGenerating(null);
        }
    };

    const sendRefine = async () => {
        if (!prompt.trim() || sending) return;
        const text = prompt.trim();
        setPrompt("");
        setSending(true);

        // Optimistic user message
        const userMsg: Message = {
            id: `opt-user-${Date.now()}`,
            role: "user",
            content_text: text,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        try {
            const res = await fetch(`/api/documents/${documentId}/refine`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instruction: text }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            await loadData(documentId);
            toast.success("Document refined!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Refinement failed");
            setMessages((prev) =>
                prev.filter((m) => m.id !== userMsg.id)
            );
        } finally {
            setSending(false);
        }
    };

    const toggleLock = (section: string) =>
        setLockedSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });

    const toggleEpicExpand = (id: string) =>
        setExpandedEpics((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const getNodeContent = (): unknown => {
        if (!latestVersion) return null;
        if (activeNode.type === "document") return latestVersion.content_json;
        if (activeNode.type === "epic") {
            const epic = epics.find((e) => e.id === activeNode.id);
            const epicStories = stories.filter((s) => s.epic_id === activeNode.id);
            return { epic, stories: epicStories };
        }
        return null;
    };

    const content = getNodeContent();

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-sidebar/60 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <Link href={`/projects/${projectId}/documents`}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    {doc && (
                        <>
                            <span className="text-sm text-muted-foreground">{doc.projects?.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">{doc.title}</span>
                            <Badge
                                variant="secondary"
                                className={doc.type === "BRD" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}
                            >
                                {doc.type}
                            </Badge>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {latestVersion && (
                        <span className="text-xs text-muted-foreground">v{latestVersion.version_number}</span>
                    )}
                    <Button asChild variant="outline" size="sm" className="border-white/10 text-xs h-8">
                        <Link href={`/projects/${projectId}/exports?documentId=${documentId}`}>
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Export
                        </Link>
                    </Button>
                </div>
            </header>

            {/* 3-panel layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Outline Tree */}
                <aside className="w-60 border-r border-white/8 flex flex-col bg-sidebar/40 shrink-0">
                    {/* Pipeline controls */}
                    <div className="p-3 border-b border-white/8 space-y-1.5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Pipeline</div>
                        {PIPELINE_STEPS.map((step) => (
                            <Button
                                key={step.key}
                                size="sm"
                                variant="secondary"
                                className="w-full justify-start text-xs h-8 gap-2 hover:bg-primary/20"
                                onClick={() => runPipeline(step)}
                                disabled={!!generating}
                            >
                                {generating === step.key ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <step.icon className="w-3.5 h-3.5 text-primary" />
                                )}
                                {step.label}
                            </Button>
                        ))}
                    </div>

                    {/* Outline tree */}
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-0.5">
                            {/* Document node */}
                            <button
                                onClick={() => setActiveNode({ type: "document" })}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${activeNode.type === "document"
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    }`}
                            >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium truncate">{doc?.type || "Document"}</span>
                                {latestVersion && (
                                    <span className="ml-auto text-[10px] opacity-60">v{latestVersion.version_number}</span>
                                )}
                            </button>

                            {/* Epics */}
                            {epics.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                                        Epics ({epics.length})
                                    </div>
                                    {epics.map((epic) => {
                                        const epicStories = stories.filter((s) => s.epic_id === epic.id);
                                        const isExpanded = expandedEpics.has(epic.id);
                                        const isActive = activeNode.type === "epic" && activeNode.id === epic.id;
                                        return (
                                            <div key={epic.id}>
                                                <button
                                                    onClick={() => {
                                                        setActiveNode({ type: "epic", id: epic.id, title: epic.title });
                                                        toggleEpicExpand(epic.id);
                                                    }}
                                                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${isActive
                                                        ? "bg-primary/20 text-primary"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                                        }`}
                                                >
                                                    {epicStories.length > 0 ? (
                                                        isExpanded ? (
                                                            <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                                        )
                                                    ) : (
                                                        <Layers className="w-3 h-3 flex-shrink-0" />
                                                    )}
                                                    <span className="truncate font-medium">{epic.title}</span>
                                                    <span className="ml-auto text-[10px] opacity-50">{epicStories.length}s</span>
                                                </button>
                                                {isExpanded && epicStories.map((story) => (
                                                    <button
                                                        key={story.id}
                                                        onClick={() => setActiveNode({ type: "story", id: story.id, title: story.title })}
                                                        className={`w-full flex items-center gap-1.5 pl-6 pr-2 py-1 rounded-lg text-left text-xs transition-colors ${activeNode.type === "story" && activeNode.id === story.id
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-white/3"
                                                            }`}
                                                    >
                                                        <BookOpen className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{story.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </aside>

                {/* CENTER: Chat */}
                <div className="flex flex-col flex-1 min-w-0 border-r border-white/8">
                    {/* Quality gate */}
                    {qualityGate && (
                        <div className={`px-4 py-2 text-xs flex items-center gap-2 border-b border-white/8 ${qualityGate.passed && qualityGate.warnings.length === 0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : qualityGate.passed
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                            }`}>
                            {qualityGate.passed ? (
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="font-medium">Quality Gate:</span>
                            {qualityGate.errors.length > 0 && (
                                <span>{qualityGate.errors[0]}</span>
                            )}
                            {qualityGate.warnings.length > 0 && qualityGate.errors.length === 0 && (
                                <span>{qualityGate.warnings[0]}</span>
                            )}
                            {qualityGate.passed && qualityGate.warnings.length === 0 && (
                                <span>All checks passed</span>
                            )}
                            <button
                                className="ml-auto hover:opacity-70"
                                onClick={() => setQualityGate(null)}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Messages */}
                    <ScrollArea className="flex-1 scrollbar-thin">
                        <div className="p-4 space-y-3 min-h-full">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                    <Zap className="w-12 h-12 mb-3 text-primary/30" />
                                    <p className="font-medium mb-1">Ready to generate</p>
                                    <p className="text-xs">Click a pipeline button → then refine with chat</p>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                                            ? "gradient-primary text-white"
                                            : msg.role === "system"
                                                ? "bg-white/5 text-muted-foreground italic text-xs"
                                                : "bg-secondary text-foreground"
                                            }`}
                                    >
                                        {msg.content_text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatBottomRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-3 border-t border-white/8 bg-sidebar/20">
                        <div className="flex gap-2">
                            <Textarea
                                placeholder={`Refine the ${doc?.type || "document"}... e.g. "Add a security NFR for GDPR compliance" or "Strengthen the scope definition"`}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendRefine();
                                    }
                                }}
                                rows={2}
                                className="bg-secondary/50 border-white/10 resize-none text-sm"
                            />
                            <Button
                                onClick={sendRefine}
                                disabled={!prompt.trim() || sending}
                                size="icon"
                                className="h-auto gradient-primary shadow-lg shadow-primary/20 min-h-[56px]"
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                            Enter to send · Shift+Enter for newline · Generates a targeted diff patch
                        </p>
                    </div>
                </div>

                {/* RIGHT: Structured viewer */}
                <div className="w-96 flex flex-col bg-background/50 shrink-0">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {activeNode.type === "document"
                                ? "Document Content"
                                : activeNode.type === "epic"
                                    ? `Epic: ${(activeNode as { type: "epic"; id: string; title: string }).title.slice(0, 25)}...`
                                    : `Story Details`}
                        </span>
                        {activeNode.type === "document" && (
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground"
                                    onClick={() => toast.info("Section locking applies per-field in pro version")}
                                >
                                    {lockedSections.has("document") ? (
                                        <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                        <Unlock className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    <ScrollArea className="flex-1 scrollbar-thin">
                        <div className="p-4">
                            {content ? (
                                <JsonViewer data={content} />
                            ) : (
                                <div className="text-center text-muted-foreground py-16">
                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Generate document to see content</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

// ─── JSON Viewer ────────────────────────────────────────────

function JsonViewer({ data }: { data: unknown }) {
    if (data === null || data === undefined) return <span className="text-muted-foreground">null</span>;
    if (typeof data === "string") {
        return <p className="text-sm text-foreground/90 leading-relaxed">{data}</p>;
    }
    if (typeof data === "number" || typeof data === "boolean") {
        return <span className="text-primary text-sm">{String(data)}</span>;
    }
    if (Array.isArray(data)) {
        return (
            <ul className="space-y-2 pl-3 border-l border-white/8">
                {data.map((item, i) => (
                    <li key={i} className="text-sm">
                        {typeof item === "string" ? (
                            <span className="text-foreground/80 flex gap-2">
                                <span className="text-primary/50 shrink-0">·</span>
                                {item}
                            </span>
                        ) : (
                            <JsonViewer data={item} />
                        )}
                    </li>
                ))}
            </ul>
        );
    }
    if (typeof data === "object") {
        const obj = data as Record<string, unknown>;
        return (
            <div className="space-y-3">
                {Object.entries(obj).map(([key, value]) => {
                    if (value === null || value === undefined) return null;
                    if (Array.isArray(value) && value.length === 0) return null;
                    return (
                        <div key={key}>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
                                {key.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm">
                                <JsonViewer data={value} />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    return <span className="text-sm text-foreground/80">{JSON.stringify(data)}</span>;
}
