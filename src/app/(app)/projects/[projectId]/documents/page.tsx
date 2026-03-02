import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
    params: Promise<{ projectId: string }>;
}

const statusColors: Record<string, string> = {
    draft: "bg-white/10 text-muted-foreground",
    review: "bg-amber-500/15 text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-400",
};

export default async function DocumentsPage({ params }: Props) {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

    if (!project) notFound();

    const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

    const brds = documents?.filter((d) => d.type === "BRD") ?? [];
    const prds = documents?.filter((d) => d.type === "PRD") ?? [];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href="/projects" className="hover:text-foreground">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">{project.name}</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Documents</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Documents</h1>
                    <p className="text-muted-foreground mt-1">BRDs and PRDs for {project.name}</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/documents/new?type=BRD`}>
                            <Plus className="w-4 h-4 mr-2" />
                            New BRD
                        </Link>
                    </Button>
                    <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href={`/projects/${projectId}/documents/new?type=PRD`}>
                            <Plus className="w-4 h-4 mr-2" />
                            New PRD
                        </Link>
                    </Button>
                </div>
            </div>

            {[{ label: "Business Requirements Documents (BRD)", items: brds, type: "BRD", color: "text-blue-400" },
            { label: "Product Requirements Documents (PRD)", items: prds, type: "PRD", color: "text-purple-400" }
            ].map(({ label, items, type, color }) => (
                <section key={type}>
                    <h2 className={`text-sm font-semibold uppercase tracking-wider ${color} mb-3`}>{label}</h2>
                    {items.length > 0 ? (
                        <div className="space-y-2">
                            {items.map((doc) => (
                                <Link
                                    key={doc.id}
                                    href={`/projects/${projectId}/builder/${doc.id}`}
                                    className="flex items-center justify-between glass-card rounded-xl px-4 py-3.5 hover:border-primary/20 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === "BRD" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                                            <FileText className={`w-4 h-4 ${color}`} />
                                        </div>
                                        <div>
                                            <div className="font-medium">{doc.title}</div>
                                            {doc.target_release && (
                                                <div className="text-xs text-muted-foreground">Target: {doc.target_release}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className={statusColors[doc.status]}>
                                            {doc.status}
                                        </Badge>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card rounded-xl px-4 py-6 text-center text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No {type}s yet.</p>
                            <Button asChild variant="ghost" size="sm" className="mt-2 text-primary">
                                <Link href={`/projects/${projectId}/documents/new?type=${type}`}>
                                    Create {type}
                                </Link>
                            </Button>
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}
