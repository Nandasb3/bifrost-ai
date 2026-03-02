/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    FolderOpen,
    FileText,
    Clock,
    ArrowRight,
    Zap,
    BookOpen,
    Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Project = {
    id: string;
    name: string;
    client_name: string | null;
    domain: string | null;
    updated_at: string;
};

type DocWithProject = {
    id: string;
    title: string;
    type: string;
    status: string;
    project_id: string;
    updated_at: string;
    projects: { name: string; owner_user_id: string } | null;
};

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sb = supabase as any;

    const [projectsRes, docsRes] = await Promise.all([
        sb.from("projects").select("id,name,client_name,domain,updated_at").order("updated_at", { ascending: false }).limit(5),
        sb.from("documents").select("id,title,type,status,project_id,updated_at,projects!inner(name,owner_user_id)").order("updated_at", { ascending: false }).limit(20),
    ]);

    const projects: Project[] = projectsRes.data ?? [];
    const documents: DocWithProject[] = ((docsRes.data ?? []) as DocWithProject[])
        .filter((d) => d.projects?.owner_user_id === user?.id)
        .slice(0, 5);

    const stats = {
        projects: projects.length,
        documents: documents.length,
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {user?.email?.split("@")[0] ?? "there"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="border-white/10 hover:bg-white/5">
                        <Link href="/projects/new">
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Projects", value: stats.projects, icon: FolderOpen, color: "text-blue-400" },
                    { label: "Documents", value: stats.documents, icon: FileText, color: "text-purple-400" },
                    { label: "Epics", value: "–", icon: Layers, color: "text-emerald-400" },
                    { label: "Stories", value: "–", icon: BookOpen, color: "text-amber-400" },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card rounded-xl p-4">
                        <div className={`${stat.color} mb-2`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* CTAs */}
            <div className="grid md:grid-cols-2 gap-4">
                <Link href="/projects/new" className="group">
                    <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-200 h-full">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Create Project</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start with project context — client, domain, tech stack, and working agreements.
                        </p>
                        <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Get started <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                </Link>
                <div className="glass-card rounded-xl p-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                        <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">How It Works</h3>
                    <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>Create a project with context</li>
                        <li>Add a BRD or PRD document</li>
                        <li>AI generates epics → stories → AC</li>
                        <li>Refine with chat commands</li>
                        <li>Export to Markdown / CSV / Jira JSON</li>
                    </ol>
                </div>
            </div>

            {/* Recent Projects */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Projects</h2>
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                        <Link href="/projects">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                    </Button>
                </div>
                {projects.length > 0 ? (
                    <div className="space-y-2">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="flex items-center justify-between glass-card rounded-xl px-4 py-3 hover:border-primary/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <FolderOpen className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{project.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {project.client_name || "No client"} · {project.domain || "No domain"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No projects yet.</p>
                        <Button asChild className="mt-4 gradient-primary" size="sm">
                            <Link href="/projects/new">Create your first project</Link>
                        </Button>
                    </div>
                )}
            </section>

            {/* Recent Documents */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Documents</h2>
                </div>
                {documents.length > 0 ? (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/projects/${doc.project_id}/builder/${doc.id}`}
                                className="flex items-center justify-between glass-card rounded-xl px-4 py-3 hover:border-primary/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{doc.title}</div>
                                        <div className="text-xs text-muted-foreground">{doc.projects?.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className={doc.type === "BRD" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}>
                                        {doc.type}
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className={
                                            doc.status === "approved" ? "bg-emerald-500/20 text-emerald-400"
                                                : doc.status === "review" ? "bg-amber-500/20 text-amber-400"
                                                    : "bg-white/10 text-muted-foreground"
                                        }
                                    >
                                        {doc.status}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No documents yet. Create a project first.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
