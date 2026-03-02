import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, BookOpen, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ documentId?: string; epicId?: string }>;
}

const statusColors: Record<string, string> = {
    draft: "bg-white/10 text-muted-foreground",
    ready: "bg-emerald-500/15 text-emerald-400",
    in_progress: "bg-blue-500/15 text-blue-400",
    done: "bg-purple-500/15 text-purple-400",
};

const priorityColors: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400",
    high: "bg-orange-500/15 text-orange-400",
    medium: "bg-amber-500/15 text-amber-400",
    low: "bg-slate-500/15 text-slate-400",
};

export default async function StoriesPage({ params, searchParams }: Props) {
    const { projectId } = await params;
    const { documentId, epicId } = await searchParams;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

    if (!project) notFound();

    let storiesQuery = supabase
        .from("stories")
        .select("*, epics(title, document_id)")
        .order("sort_order");

    if (epicId) {
        storiesQuery = storiesQuery.eq("epic_id", epicId);
    } else if (documentId) {
        storiesQuery = supabase
            .from("stories")
            .select("*, epics!inner(title, document_id)")
            .eq("epics.document_id", documentId)
            .order("sort_order");
    } else {
        storiesQuery = supabase
            .from("stories")
            .select("*, epics!inner(title, document_id, documents!inner(project_id))")
            .eq("epics.documents.project_id", projectId)
            .order("sort_order");
    }

    const { data: stories } = await storiesQuery;
    const storyIds = stories?.map((s) => s.id) ?? [];

    const { data: acCounts } = storyIds.length > 0
        ? await supabase.from("acceptance_criteria").select("story_id").in("story_id", storyIds)
        : { data: [] };

    const acCountMap = acCounts?.reduce<Record<string, number>>((acc, ac) => {
        acc[ac.story_id] = (acc[ac.story_id] || 0) + 1;
        return acc;
    }, {}) ?? {};

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href="/projects" className="hover:text-foreground">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">{project.name}</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Stories</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Stories</h1>
                    <p className="text-muted-foreground mt-1">{stories?.length ?? 0} stories</p>
                </div>
                {documentId && (
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/epics?documentId=${documentId}`}>
                            Back to Epics
                        </Link>
                    </Button>
                )}
            </div>

            {stories && stories.length > 0 ? (
                <div className="space-y-3">
                    {stories.map((story) => {
                        const acCount = acCountMap[story.id] ?? 0;
                        const qualityOk = acCount >= 3;
                        return (
                            <Link
                                key={story.id}
                                href={`/projects/${projectId}/stories/${story.id}`}
                                className="block glass-card rounded-xl p-5 hover:border-primary/20 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <BookOpen className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold group-hover:text-primary transition-colors">{story.title}</h3>
                                            {story.story_statement && (
                                                <p className="text-xs text-muted-foreground mt-0.5 italic">{story.story_statement}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary" className={priorityColors[story.priority] ?? "bg-white/10"}>
                                            {story.priority}
                                        </Badge>
                                        <Badge variant="secondary" className={statusColors[story.status] ?? "bg-white/10"}>
                                            {story.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between ml-11">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center gap-1 text-xs ${qualityOk ? "text-emerald-400" : "text-amber-400"}`}>
                                            {qualityOk ? (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            )}
                                            {acCount} AC
                                        </span>
                                        {story.epics?.title && (
                                            <span className="text-xs text-muted-foreground">
                                                Epic: {story.epics.title}
                                            </span>
                                        )}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="glass-card rounded-xl p-16 text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Generate epics first, then run &quot;Generate Stories + AC&quot; in the builder.
                    </p>
                    <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href={`/projects/${projectId}/documents`}>Go to Documents</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
