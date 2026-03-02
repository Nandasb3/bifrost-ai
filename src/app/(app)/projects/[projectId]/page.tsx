import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen,
    FileText,
    Layers,
    Upload,
    Plus,
    Settings,
    ArrowRight,
    Download,
    ChevronRight,
} from "lucide-react";

interface Props {
    params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: Props) {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

    if (error || !project) notFound();

    const [{ data: contextItems }, { data: documents }] = await Promise.all([
        supabase.from("context_items").select("id").eq("project_id", projectId),
        supabase.from("documents").select("id, type, status").eq("project_id", projectId),
    ]);

    const cards = [
        {
            href: `/projects/${projectId}/context`,
            icon: BookOpen,
            color: "bg-emerald-500/20 text-emerald-400",
            label: "Context",
            description: "Add constraints, requirements, and reference materials",
            count: contextItems?.length,
            countLabel: "items",
        },
        {
            href: `/projects/${projectId}/documents`,
            icon: FileText,
            color: "bg-purple-500/20 text-purple-400",
            label: "Documents",
            description: "Manage BRDs and PRDs",
            count: documents?.length,
            countLabel: "docs",
        },
        {
            href: `/projects/${projectId}/epics`,
            icon: Layers,
            color: "bg-blue-500/20 text-blue-400",
            label: "Epics & Stories",
            description: "View generated epics, stories, and acceptance criteria",
        },
        {
            href: `/projects/${projectId}/exports`,
            icon: Download,
            color: "bg-amber-500/20 text-amber-400",
            label: "Exports",
            description: "Download Markdown, CSV, or Jira JSON",
        },
    ];

    const techStack = Array.isArray(project.tech_stack) ? project.tech_stack as string[] : [];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{project.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{project.name}</h1>
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground text-sm">
                        {project.client_name && <span>{project.client_name}</span>}
                        {project.client_name && project.domain && <span>·</span>}
                        {project.domain && <span>{project.domain}</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="border-white/10">
                        <Link href={`/projects/${projectId}/settings`}>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Link>
                    </Button>
                    <Button asChild size="sm" className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href={`/projects/${projectId}/documents/new?type=PRD`}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Document
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap gap-2">
                {techStack.map((t: string) => (
                    <Badge key={t} variant="secondary" className="bg-white/8 text-xs">{t}</Badge>
                ))}
                {project.jira_project_key && (
                    <Badge variant="secondary" className="bg-blue-500/15 text-blue-400 text-xs">
                        Jira: {project.jira_project_key}
                    </Badge>
                )}
                {project.story_format && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{project.story_format}</Badge>
                )}
                {project.release_cadence && (
                    <Badge variant="secondary" className="bg-white/8 text-xs">{project.release_cadence}</Badge>
                )}
            </div>

            {/* DoD */}
            {project.definition_of_done && (
                <div className="glass-card rounded-xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Definition of Done</div>
                    <p className="text-sm text-foreground/80">{project.definition_of_done}</p>
                </div>
            )}

            {/* Navigation cards */}
            <div className="grid sm:grid-cols-2 gap-4">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href} className="group">
                        <div className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                {card.count !== undefined && (
                                    <span className="text-xs text-muted-foreground bg-white/8 px-2 py-1 rounded-full">
                                        {card.count} {card.countLabel}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-semibold mb-1">{card.label}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{card.description}</p>
                            <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                                Open <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick actions */}
            <div className="grid sm:grid-cols-3 gap-3">
                <Button asChild variant="outline" className="border-white/10 justify-start gap-3 h-auto py-3">
                    <Link href={`/projects/${projectId}/context/new`}>
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <div className="text-left">
                            <div className="text-sm font-medium">Add Context</div>
                            <div className="text-xs text-muted-foreground">Manual input</div>
                        </div>
                    </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10 justify-start gap-3 h-auto py-3">
                    <Link href={`/projects/${projectId}/context/upload`}>
                        <Upload className="w-4 h-4 text-blue-400" />
                        <div className="text-left">
                            <div className="text-sm font-medium">Upload Files</div>
                            <div className="text-xs text-muted-foreground">PDF, DOC, TXT</div>
                        </div>
                    </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10 justify-start gap-3 h-auto py-3">
                    <Link href={`/projects/${projectId}/documents/new?type=BRD`}>
                        <FileText className="w-4 h-4 text-purple-400" />
                        <div className="text-left">
                            <div className="text-sm font-medium">New BRD</div>
                            <div className="text-xs text-muted-foreground">Business requirements</div>
                        </div>
                    </Link>
                </Button>
            </div>
        </div>
    );
}
