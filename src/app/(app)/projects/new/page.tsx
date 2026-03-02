"use client";

import { useState } from "react";
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
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewProjectPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [techStackInput, setTechStackInput] = useState("");
    const [techStack, setTechStack] = useState<string[]>([]);

    const [form, setForm] = useState({
        name: "",
        client_name: "",
        domain: "",
        jira_project_key: "",
        release_cadence: "2-week sprints",
        story_format: "gherkin",
        definition_of_done: "",
    });

    const addTech = () => {
        const t = techStackInput.trim();
        if (t && !techStack.includes(t)) {
            setTechStack((prev) => [...prev, t]);
            setTechStackInput("");
        }
    };

    const removeTech = (t: string) => setTechStack((prev) => prev.filter((x) => x !== t));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Project name is required");
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("projects")
                .insert({
                    ...form,
                    tech_stack: techStack,
                    owner_user_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            toast.success("Project created!");
            router.push(`/projects/${data.id}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    const field = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <Button asChild variant="ghost" size="sm" className="mb-4 text-muted-foreground">
                    <Link href="/projects">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Projects
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold gradient-text">New Project</h1>
                <p className="text-muted-foreground mt-1">Set up the foundation for your BA documentation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="glass-card rounded-xl p-6 space-y-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Basic Info</h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Customer Portal Revamp"
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
                                placeholder="e.g. Acme Corp"
                                value={form.client_name}
                                onChange={(e) => field("client_name", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="domain">Domain</Label>
                        <Input
                            id="domain"
                            placeholder="e.g. E-commerce, FinTech, SaaS, Healthcare"
                            value={form.domain}
                            onChange={(e) => field("domain", e.target.value)}
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>
                </div>

                <div className="glass-card rounded-xl p-6 space-y-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tech & Process</h2>

                    <div className="space-y-2">
                        <Label>Tech Stack</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. Next.js, PostgreSQL, AWS"
                                value={techStackInput}
                                onChange={(e) => setTechStackInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
                                className="bg-secondary/50 border-white/10"
                            />
                            <Button type="button" variant="secondary" onClick={addTech}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {techStack.map((t) => (
                                    <span
                                        key={t}
                                        className="flex items-center gap-1.5 text-xs bg-primary/15 text-primary rounded-full px-3 py-1"
                                    >
                                        {t}
                                        <button type="button" onClick={() => removeTech(t)}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="jira_project_key">Jira Project Key (optional)</Label>
                            <Input
                                id="jira_project_key"
                                placeholder="e.g. CPR"
                                value={form.jira_project_key}
                                onChange={(e) => field("jira_project_key", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
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
                    </div>

                    <div className="space-y-2">
                        <Label>Story Format</Label>
                        <Select value={form.story_format} onValueChange={(v) => field("story_format", v)}>
                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gherkin">Gherkin (Given/When/Then)</SelectItem>
                                <SelectItem value="narrative">Narrative (As a/I want/So that)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="glass-card rounded-xl p-6 space-y-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Working Agreements</h2>
                    <div className="space-y-2">
                        <Label htmlFor="dod">Definition of Done</Label>
                        <Textarea
                            id="dod"
                            placeholder="e.g. Code reviewed, unit tests ≥80% coverage, accessibility checked, documentation updated, approved by PO"
                            value={form.definition_of_done}
                            onChange={(e) => field("definition_of_done", e.target.value)}
                            rows={4}
                            className="bg-secondary/50 border-white/10 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href="/projects">Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        className="gradient-primary shadow-lg shadow-primary/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                        ) : (
                            "Create Project"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
