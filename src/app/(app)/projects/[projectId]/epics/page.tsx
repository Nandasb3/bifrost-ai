import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Layers, ArrowRight, BookOpen } from "lucide-react";

interface Props {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ documentId?: string }>;
}

const priorityColors: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400",
    high: "bg-orange-500/15 text-orange-400",
    medium: "bg-amber-500/15 text-amber-400",
    low: "bg-slate-500/15 text-slate-400",
};

export default async function EpicsPage({ params, searchParams }: Props) {
    const { projectId } = await params;
    const { documentId } = await searchParams;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

    if (!project) notFound();

    // If no documentId, load all epics for this project
    let epicsQuery = supabase
        .from("epics")
        .select("*, documents(title, type)")
        .order("sort_order");

    if (documentId) {
        epicsQuery = epicsQuery.eq("document_id", documentId);
    } else {
        // Join through documents to filter by project
        epicsQuery = supabase
            .from("epics")
            .select("*, documents!inner(title, type, project_id)")
            .eq("documents.project_id", projectId)
            .order("sort_order");
    }

    const { data: epics } = await epicsQuery;

    const epicIds = epics?.map((e) => e.id) ?? [];
    const { data: storyCounts } = epicIds.length > 0
        ? await supabase
            .from("stories")
            .select("epic_id")
            .in("epic_id", epicIds)
        : { data: [] };

    const storyCountMap = storyCounts?.reduce<Record<string, number>>((acc, s) => {
        acc[s.epic_id] = (acc[s.epic_id] || 0) + 1;
        return acc;
    }, {}) ?? {};

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href="/projects" className="hover:text-foreground">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">{project.name}</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Epics</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Epics</h1>
                    <p className="text-muted-foreground mt-1">
                        {epics?.length ?? 0} epics across {documentId ? "this document" : "all documents"}
                    </p>
                </div>
                {documentId && (
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/stories?documentId=${documentId}`}>
                            <BookOpen className="w-4 h-4 mr-2" />
                            View Stories
                        </Link>
                    </Button>
                )}
            </div>

            {epics && epics.length > 0 ? (
                <div className="space-y-3">
                    {epics.map((epic) => (
                        <div key={epic.id} className="glass-card rounded-xl p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Layers className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold">{epic.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className={priorityColors[epic.priority] ?? "bg-white/10"}>
                                        {epic.priority}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground bg-white/8 px-2 py-0.5 rounded-full">
                                        {storyCountMap[epic.id] ?? 0} stories
                                    </span>
                                </div>
                            </div>

                            {epic.description && (
                                <p className="text-sm text-muted-foreground mb-2 ml-10">{epic.description}</p>
                            )}
                            {epic.business_value && (
                                <p className="text-xs text-emerald-400/80 ml-10">
                                    <span className="font-medium">Business value:</span> {epic.business_value}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-3 ml-10">
                                <div className="flex flex-wrap gap-2">
                                    {epic.target_release && (
                                        <span className="text-xs bg-white/8 px-2 py-0.5 rounded-full text-muted-foreground">
                                            {epic.target_release}
                                        </span>
                                    )}
                                    {epic.dependencies?.length > 0 && (
                                        <span className="text-xs bg-white/8 px-2 py-0.5 rounded-full text-muted-foreground">
                                            {epic.dependencies.length} dep(s)
                                        </span>
                                    )}
                                </div>
                                <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
                                    <Link href={`/projects/${projectId}/stories?documentId=${epic.document_id}&epicId=${epic.id}`}>
                                        Stories <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-xl p-16 text-center">
                    <Layers className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <h3 className="text-xl font-semibold mb-2">No epics yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Generate a PRD first, then run &quot;Generate Epics&quot; in the document builder.
                    </p>
                    <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href={`/projects/${projectId}/documents`}>Go to Documents</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
