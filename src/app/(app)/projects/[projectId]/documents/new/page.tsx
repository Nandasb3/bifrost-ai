"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Zap, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
    params: Promise<{ projectId: string }>;
}

export default function NewDocumentPage({ params: paramsPromise }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = (searchParams.get("type") ?? "PRD") as "BRD" | "PRD";
    const [projectId, setProjectId] = useState<string>("");
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [contextItems, setContextItems] = useState<Array<{ id: string; title: string; type: string }>>([]);
    const [selectedContext, setSelectedContext] = useState<string[]>([]);
    const [form, setForm] = useState({
        type: defaultType,
        title: "",
        target_release: "",
        seed_input: "",
    });

    useEffect(() => {
        paramsPromise.then(({ projectId: pid }) => {
            setProjectId(pid);
            supabase
                .from("context_items")
                .select("id, title, type")
                .eq("project_id", pid)
                .then(({ data }) => setContextItems(data ?? []));
        });
    }, []);

    const toggleContext = (id: string) =>
        setSelectedContext((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.seed_input.trim()) {
            toast.error("Title and feature description are required");
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("documents")
                .insert({
                    project_id: projectId,
                    type: form.type,
                    title: form.title,
                    target_release: form.target_release || null,
                    seed_input: form.seed_input,
                    context_item_ids: selectedContext,
                    status: "draft",
                    created_by: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            toast.success("Document created! Opening builder...");
            router.push(`/projects/${projectId}/builder/${data.id}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create document");
        } finally {
            setLoading(false);
        }
    };

    const field = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href={`/projects/${projectId}/documents`} className="hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Documents
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">New {form.type}</span>
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-1">New {form.type}</h1>
            <p className="text-muted-foreground mb-6">Describe your feature and we&apos;ll generate the full document</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="glass-card rounded-xl p-6 space-y-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Document Type</h2>
                    <div className="flex gap-3">
                        {(["BRD", "PRD"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => field("type", type)}
                                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border ${form.type === type
                                        ? "gradient-primary text-white border-transparent shadow-lg shadow-primary/20"
                                        : "border-white/10 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                                    }`}
                            >
                                {type === "BRD" ? "Business Requirements (BRD)" : "Product Requirements (PRD)"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="glass-card rounded-xl p-6 space-y-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Document Info</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder={`e.g. ${form.type === "BRD" ? "Customer Portal BRD" : "Checkout Redesign PRD"}`}
                                value={form.title}
                                onChange={(e) => field("title", e.target.value)}
                                required
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_release">Target Release (optional)</Label>
                            <Input
                                id="target_release"
                                placeholder="e.g. Q3 2025, Sprint 12"
                                value={form.target_release}
                                onChange={(e) => field("target_release", e.target.value)}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="seed_input">Feature Description *</Label>
                        <Textarea
                            id="seed_input"
                            placeholder={`Describe the feature or product area. Be detailed — this seeds the entire ${form.type} generation.\n\nExample: "We need to redesign the checkout flow to reduce cart abandonment. The new flow should support guest checkout, multiple payment methods (card, PayPal, Apple Pay), address autocomplete, and order summary with upsells. Target: reduce checkout time by 40%, increase conversion by 15%."`}
                            value={form.seed_input}
                            onChange={(e) => field("seed_input", e.target.value)}
                            required
                            rows={7}
                            className="bg-secondary/50 border-white/10 resize-none"
                        />
                    </div>
                </div>

                {contextItems.length > 0 && (
                    <div className="glass-card rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                            Attach Context ({selectedContext.length} selected)
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Select context items to ground the AI generation
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-2">
                            {contextItems.map((item) => (
                                <label
                                    key={item.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedContext.includes(item.id)
                                            ? "bg-primary/10 border border-primary/20"
                                            : "hover:bg-white/5 border border-transparent"
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedContext.includes(item.id)}
                                        onCheckedChange={() => toggleContext(item.id)}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <div className="text-sm font-medium">{item.title}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {contextItems.length === 0 && (
                    <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-sm text-muted-foreground">
                        <BookOpen className="w-5 h-5 text-primary/50 flex-shrink-0" />
                        <span>
                            No context items yet.{" "}
                            <Link href={`/projects/${projectId}/context/new`} className="text-primary hover:underline">
                                Add context
                            </Link>{" "}
                            to improve AI generation quality.
                        </span>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Button asChild variant="outline" className="border-white/10">
                        <Link href={`/projects/${projectId}/documents`}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        className="gradient-primary shadow-lg shadow-primary/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                        ) : (
                            <><Zap className="w-4 h-4 mr-2" />Create & Open Builder</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
