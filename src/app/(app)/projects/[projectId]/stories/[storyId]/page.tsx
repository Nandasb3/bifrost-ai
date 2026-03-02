import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { ImproveACButton } from "@/components/improve-ac-button";

interface Props {
    params: Promise<{ projectId: string; storyId: string }>;
}

const typeColors: Record<string, string> = {
    functional: "bg-blue-500/15 text-blue-400",
    validation: "bg-purple-500/15 text-purple-400",
    error: "bg-red-500/15 text-red-400",
    edge: "bg-amber-500/15 text-amber-400",
    nfr: "bg-emerald-500/15 text-emerald-400",
};

export default async function StoryDetailPage({ params }: Props) {
    const { projectId, storyId } = await params;
    const supabase = await createClient();

    const { data: storyRes } = await (supabase as any)
        .from("stories")
        .select("*, epics(title, document_id)")
        .eq("id", storyId)
        .single();
    const story = storyRes;

    if (!story) notFound();

    const { data: acsRes } = await (supabase as any)
        .from("acceptance_criteria")
        .select("*")
        .eq("story_id", storyId)
        .order("sort_order");
    const acs = acsRes as any[];

    const acCount = acs?.length ?? 0;
    const qualityOk = acCount >= 3;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link href={`/projects/${projectId}/stories`} className="hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Stories
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground truncate">{story.title}</span>
            </div>

            {/* Story Header */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text mb-2">{story.title}</h1>
                        {story.story_statement && (
                            <p className="text-muted-foreground italic text-sm">{story.story_statement}</p>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                        <Badge variant="secondary" className="bg-white/10">{story.status}</Badge>
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-400">{story.priority}</Badge>
                    </div>
                </div>

                {story.description && (
                    <p className="text-sm text-foreground/80 mb-4">{story.description}</p>
                )}

                {story.business_rules && story.business_rules.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Business Rules</div>
                        <ul className="space-y-1.5">
                            {story.business_rules.map((rule: string, i: number) => (
                                <li key={i} className="text-sm flex gap-2 text-foreground/80">
                                    <span className="text-primary/50 shrink-0">·</span>
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Quality indicator */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${qualityOk ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                {qualityOk ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                    <div className={`text-sm font-medium ${qualityOk ? "text-emerald-400" : "text-amber-400"}`}>
                        {acCount} Acceptance Criteria
                        {!qualityOk && " — Minimum 3 required"}
                    </div>
                    {!qualityOk && (
                        <div className="text-xs text-muted-foreground">This story needs more AC for quality gate to pass</div>
                    )}
                </div>
                <div className="ml-auto">
                    <ImproveACButton storyId={storyId} projectId={projectId} />
                </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Acceptance Criteria</h2>
                {acs && acs.length > 0 ? (
                    <div className="space-y-3">
                        {acs.map((ac, idx) => (
                            <div key={ac.id} className="glass-card rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                        <Badge variant="secondary" className={`text-xs ${typeColors[ac.type] ?? "bg-white/10"}`}>
                                            {ac.type}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-primary/80 shrink-0 w-14">Given</span>
                                        <span className="text-foreground/80">{ac.given}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-purple-400/80 shrink-0 w-14">When</span>
                                        <span className="text-foreground/80">{ac.when}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-emerald-400/80 shrink-0 w-14">Then</span>
                                        <span className="text-foreground/80">{ac.then}</span>
                                    </div>
                                    {ac.notes && (
                                        <div className="text-xs text-muted-foreground pt-1 border-t border-white/8">
                                            {ac.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                        <p>No acceptance criteria yet. Generate stories from the builder first.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
