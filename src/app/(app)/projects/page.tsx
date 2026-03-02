import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Clock, ArrowRight, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function ProjectsPage() {
    const supabase = await createClient();
    const { data: projectsRes } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
    const projects = projectsRes as any[];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Projects</h1>
                    <p className="text-muted-foreground mt-1">Manage your BA documentation projects</p>
                </div>
                <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                    <Link href="/projects/new">
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Link>
                </Button>
            </div>

            {projects && projects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((project) => (
                        <div key={project.id} className="glass-card rounded-xl p-5 hover:border-primary/20 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                                        <FolderOpen className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{project.name}</h3>
                                        <p className="text-sm text-muted-foreground">{project.client_name || "No client"}</p>
                                    </div>
                                </div>
                                <Button asChild variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/projects/${project.id}/settings`}>
                                        <Settings className="w-4 h-4" />
                                    </Link>
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {project.domain && (
                                    <Badge variant="secondary" className="bg-white/8 text-xs">
                                        {project.domain}
                                    </Badge>
                                )}
                                {project.story_format && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                        {project.story_format}
                                    </Badge>
                                )}
                                {project.jira_project_key && (
                                    <Badge variant="secondary" className="bg-blue-500/15 text-blue-400 text-xs">
                                        {project.jira_project_key}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                                </div>
                                <Link
                                    href={`/projects/${project.id}`}
                                    className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Open <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-xl p-16 text-center">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Create your first project to start generating AI-powered BA documentation.
                    </p>
                    <Button asChild className="gradient-primary shadow-lg shadow-primary/20">
                        <Link href="/projects/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Project
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
