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
import { ArrowLeft, Loader2, Plus, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
    params: Promise<{ projectId: string }>;
}

export default function NewContextPage({ params: paramsPromise }: Props) {
    const router = useRouter();
    const [projectId, setProjectId] = useState<string>("");
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [form, setForm] = useState({
        type: "requirement",
        title: "",
        content: "",
    });

    // Resolve params
    paramsPromise.then(({ projectId: pid }) => {
        if (!projectId) setProjectId(pid);
    });

    const addTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (t && !tags.includes(t)) {
            setTags((prev) => [...prev, t]);
            setTagInput("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            toast.error("Title and content are required");
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.from("context_items").insert({
                project_id: projectId,
                type: form.type,
                title: form.title,
                content: form.content,
                tags,
                source_type: "manual",
                created_by: user.id,
            });

            if (error) throw error;
            toast.success("Context item added!");
            router.push(`/projects/${projectId}/context`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to add context");
        } finally {
            setLoading(false);
        }
    };

    const field = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href={`/projects/${projectId}/context`} className="hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Context
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Add Item</span>
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-1">Add Context</h1>
            <p className="text-muted-foreground mb-6">Document a reference item for AI-grounded generation</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="glass-card rounded-xl p-6 space-y-5">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => field("type", v)}>
                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="requirement">Requirement</SelectItem>
                                <SelectItem value="constraint">Constraint</SelectItem>
                                <SelectItem value="api">API / Integration</SelectItem>
                                <SelectItem value="compliance">Compliance / Regulation</SelectItem>
                                <SelectItem value="architecture">Architecture Decision</SelectItem>
                                <SelectItem value="glossary">Glossary Term</SelectItem>
                                <SelectItem value="decision">Business Decision</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            placeholder="Short, descriptive title"
                            value={form.title}
                            onChange={(e) => field("title", e.target.value)}
                            required
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Content *</Label>
                        <Textarea
                            id="content"
                            placeholder="Describe the context item in detail. Be specific — AI will use this when generating documentation."
                            value={form.content}
                            onChange={(e) => field("content", e.target.value)}
                            required
                            rows={6}
                            className="bg-secondary/50 border-white/10 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                                className="bg-secondary/50 border-white/10"
                            />
                            <Button type="button" variant="secondary" onClick={addTag}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((t) => (
                                    <span key={t} className="flex items-center gap-1.5 text-xs bg-primary/15 text-primary rounded-full px-3 py-1">
                                        {t}
                                        <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/context`}>Cancel</Link>
                    </Button>
                    <Button type="submit" className="gradient-primary shadow-lg shadow-primary/20" disabled={loading}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Context Item"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
