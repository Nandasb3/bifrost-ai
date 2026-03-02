"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
    params: Promise<{ projectId: string }>;
}

export default function ProjectSettingsPage({ params: paramsPromise }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const sb = (supabase as any);
    const [projectId, setProjectId] = useState("");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        name: "",
        client_name: "",
        domain: "",
        jira_project_key: "",
        release_cadence: "2-week sprints",
        story_format: "gherkin",
        definition_of_done: "",
    });

    useEffect(() => {
        paramsPromise.then(({ projectId: pid }) => {
            setProjectId(pid);
            sb
                .from("projects")
                .select("*")
                .eq("id", pid)
                .single()
                .then(({ data }: { data: any }) => {
                    if (data) {
                        setForm({
                            name: data.name ?? "",
                            client_name: data.client_name ?? "",
                            domain: data.domain ?? "",
                            jira_project_key: data.jira_project_key ?? "",
                            release_cadence: data.release_cadence ?? "2-week sprints",
                            story_format: data.story_format ?? "gherkin",
                            definition_of_done: data.definition_of_done ?? "",
                        });
                    }
                });
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await sb
                .from("projects")
                .update({ ...form, updated_at: new Date().toISOString() })
                .eq("id", projectId);
            if (error) throw error;
            toast.success("Project settings saved!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this project? This cannot be undone. All documents and data will be permanently deleted.")) return;
        setDeleting(true);
        try {
            const { error } = await sb.from("projects").delete().eq("id", projectId);
            if (error) throw error;
            toast.success("Project deleted");
            router.push("/projects");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const field = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href={`/projects/${projectId}`} className="hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Project
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Settings</span>
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-1">Project Settings</h1>
            <p className="text-muted-foreground mb-6">Edit project configuration</p>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="glass-card rounded-xl p-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => field("name", e.target.value)}
                                required
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client_name">Client Name</Label>
                            <Input
                                id="client_name"
                                value={form.client_name}
                                onChange={(e) => field("client_name", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input
                                id="domain"
                                value={form.domain}
                                onChange={(e) => field("domain", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jira_project_key">Jira Project Key</Label>
                            <Input
                                id="jira_project_key"
                                placeholder="e.g. PROJ"
                                value={form.jira_project_key}
                                onChange={(e) => field("jira_project_key", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Release Cadence</Label>
                            <Select value={form.release_cadence} onValueChange={(v) => field("release_cadence", v)}>
                                <SelectTrigger className="bg-secondary/50 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1-week sprints">1-week sprints</SelectItem>
                                    <SelectItem value="2-week sprints">2-week sprints</SelectItem>
                                    <SelectItem value="3-week sprints">3-week sprints</SelectItem>
                                    <SelectItem value="Monthly releases">Monthly releases</SelectItem>
                                    <SelectItem value="Continuous">Continuous delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Story Format</Label>
                            <Select value={form.story_format} onValueChange={(v) => field("story_format", v)}>
                                <SelectTrigger className="bg-secondary/50 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gherkin">Gherkin (Given/When/Then)</SelectItem>
                                    <SelectItem value="narrative">Narrative</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dod">Definition of Done</Label>
                        <Textarea
                            id="dod"
                            value={form.definition_of_done}
                            onChange={(e) => field("definition_of_done", e.target.value)}
                            rows={3}
                            className="bg-secondary/50 border-white/10 resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="gradient-primary shadow-lg shadow-primary/20" disabled={loading}>
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" />Save Changes</>
                        )}
                    </Button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="mt-8 glass-card rounded-xl p-6 border border-red-500/20">
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete this project and all associated data, including documents, epics, stories, and acceptance criteria.
                </p>
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                    {deleting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                    ) : (
                        <><Trash2 className="w-4 h-4 mr-2" />Delete Project</>
                    )}
                </Button>
            </div>
        </div>
    );
}
