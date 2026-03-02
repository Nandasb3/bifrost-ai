import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, BookOpen, ChevronRight, Tag, FileUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
    params: Promise<{ projectId: string }>;
}

const typeColors: Record<string, string> = {
    constraint: "bg-red-500/15 text-red-400",
    requirement: "bg-blue-500/15 text-blue-400",
    api: "bg-cyan-500/15 text-cyan-400",
    compliance: "bg-amber-500/15 text-amber-400",
    architecture: "bg-purple-500/15 text-purple-400",
    glossary: "bg-emerald-500/15 text-emerald-400",
    decision: "bg-orange-500/15 text-orange-400",
};

export default async function ContextPage({ params }: Props) {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data: projectRes } = await (supabase as any)
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
    const project = projectRes;

    if (!project) notFound();

    const { data: itemsRes } = await (supabase as any)
        .from("context_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
    const items = itemsRes as any[];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href="/projects" className="hover:text-foreground">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">{project.name}</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Context</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Context</h1>
                    <p className="text-muted-foreground mt-1">Reference materials that ground AI generation</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/context/upload`}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                        </Link>
                    </Button>
                    <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href={`/projects/${projectId}/context/new`}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Context
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Type filter counts */}
            {items && items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(
                        items.reduce<Record<string, number>>((acc, item) => {
                            acc[item.type] = (acc[item.type] || 0) + 1;
                            return acc;
                        }, {})
                    ).map(([type, count]) => (
                        <span key={type} className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[type] || "bg-white/10"}`}>
                            {type} ({count})
                        </span>
                    ))}
                </div>
            )}

            {items && items.length > 0 ? (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="glass-card rounded-xl p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[item.type] || "bg-white/10"}`}>
                                        {item.type}
                                    </span>
                                    {item.source_type === "upload" && (
                                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                            <FileUp className="w-3 h-3" /> {item.file_name}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </span>
                            </div>
                            <h3 className="font-semibold mb-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                            {item.tags && item.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                    {item.tags.map((tag: string) => (
                                        <span key={tag} className="text-xs bg-white/8 px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-xl p-16 text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <h3 className="text-xl font-semibold mb-2">No context items yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Add constraints, requirements, APIs, compliance rules, or architecture decisions here.
                        AI will use this context when generating documentation.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button asChild variant="outline" className="border-white/10">
                            <Link href={`/projects/${projectId}/context/upload`}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload File
                            </Link>
                        </Button>
                        <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                            <Link href={`/projects/${projectId}/context/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Manually
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
