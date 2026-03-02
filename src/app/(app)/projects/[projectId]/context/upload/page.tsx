"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, CheckCircle, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
    params: Promise<{ projectId: string }>;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.md";

export default function UploadContextPage({ params: paramsPromise }: Props) {
    const router = useRouter();
    const [projectId, setProjectId] = useState<string>("");
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");
    const [uploaded, setUploaded] = useState(false);

    paramsPromise.then(({ projectId: pid }) => {
        if (!projectId) setProjectId(pid);
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select a file");
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const ext = file.name.split(".").pop() ?? "bin";
            const storagePath = `${projectId}/${Date.now()}_${file.name}`;

            const { error: storageError } = await supabase.storage
                .from("context-files")
                .upload(storagePath, file);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase.from("context_items").insert({
                project_id: projectId,
                type: "requirement",
                title: file.name.replace(`.${ext}`, ""),
                content: notes || `Uploaded file: ${file.name}`,
                tags: [ext],
                source_type: "upload",
                storage_path: storagePath,
                file_name: file.name,
                file_size: file.size,
                notes,
                created_by: user.id,
            });

            if (dbError) throw dbError;

            setUploaded(true);
            toast.success("File uploaded successfully!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href={`/projects/${projectId}/context`} className="hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Context
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Upload File</span>
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-1">Upload Context File</h1>
            <p className="text-muted-foreground mb-6">Upload PDF, DOC, TXT, or Markdown files as project context</p>

            {uploaded ? (
                <div className="glass-card rounded-xl p-12 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                    <h3 className="text-xl font-semibold mb-2">File Uploaded!</h3>
                    <p className="text-muted-foreground mb-6">
                        The file has been stored and a context item was created.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            className="border-white/10"
                            onClick={() => { setFile(null); setNotes(""); setUploaded(false); }}
                        >
                            Upload Another
                        </Button>
                        <Button
                            className="gradient-primary shadow-lg shadow-primary/20"
                            onClick={() => router.push(`/projects/${projectId}/context`)}
                        >
                            View Context
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="glass-card rounded-xl p-6 space-y-5">
                        {/* Drop zone */}
                        <div className="space-y-2">
                            <Label htmlFor="file">File *</Label>
                            <label
                                htmlFor="file"
                                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${file
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-white/15 hover:border-primary/30 hover:bg-white/3"
                                    }`}
                            >
                                {file ? (
                                    <>
                                        <FileText className="w-10 h-10 text-primary" />
                                        <div className="text-center">
                                            <div className="font-medium">{file.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                        <span className="text-sm text-primary">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-muted-foreground" />
                                        <div className="text-center">
                                            <div className="font-medium">Click to select or drag a file</div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                PDF, DOC, DOCX, TXT, MD up to 10MB
                                            </div>
                                        </div>
                                    </>
                                )}
                                <Input
                                    id="file"
                                    type="file"
                                    accept={ACCEPTED_TYPES}
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Describe what this file contains and how it should inform AI generation..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="bg-secondary/50 border-white/10 resize-none"
                            />
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground">
                        <strong className="text-foreground">Note:</strong> Files are securely stored in Supabase Storage.
                        Full OCR/parsing is optional — the file and your notes will be used as context.
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button asChild variant="outline" className="border-white/10">
                            <Link href={`/projects/${projectId}/context`}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            className="gradient-primary shadow-lg shadow-primary/20"
                            disabled={loading || !file}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" />Upload File</>
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
