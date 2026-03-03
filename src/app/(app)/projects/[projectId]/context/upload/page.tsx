"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, CheckCircle, FileText, ChevronRight, Cloud } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { GoogleDrivePicker } from "@/components/google-drive-picker";

interface Props {
    params: Promise<{ projectId: string }>;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.md";

export default function UploadContextPage({ params: paramsPromise }: Props) {
    const router = useRouter();
    const [projectId, setProjectId] = useState<string>("");
    const supabase = createClient();
    const sb = (supabase as any);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");
    const [uploaded, setUploaded] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    paramsPromise.then(({ projectId: pid }) => {
        if (!projectId) setProjectId(pid);
    });

    const handleGoogleFileSelect = async (gFile: { id: string, name: string, mimeType: string }) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // For Google Docs/Sheets, we store the ID and title, but we might want to fetch the content or export it to PDF later.
            // For now, we'll store it as a 'google_drive' source.
            const { error: dbError } = await sb.from("context_items").insert({
                project_id: projectId,
                type: "requirement",
                title: gFile.name,
                content: notes || `Imported from Google Drive: ${gFile.name}`,
                tags: [gFile.mimeType.split("/").pop()],
                source_type: "google_drive",
                google_file_id: gFile.id,
                file_name: gFile.name,
                notes,
                created_by: user.id,
            });

            if (dbError) throw dbError;

            setUploaded(true);
            toast.success("Google Drive file imported!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
            setLoading(false);
        }
    };

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

            const { error: storageError } = await sb.storage
                .from("context-files")
                .upload(storagePath, file);

            if (storageError) throw storageError;

            const { error: dbError } = await sb.from("context_items").insert({
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
                <span className="text-foreground">Add Context</span>
            </div>

            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">Add Project Context</h1>
                    <p className="text-muted-foreground">Upload files or import from your Drive to inform AI generation</p>
                </div>
                <Button
                    onClick={() => setPickerOpen(true)}
                    variant="outline"
                    className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary-foreground group transition-all rounded-xl h-11"
                >
                    <Cloud className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Import from Drive
                </Button>
            </div>

            <GoogleDrivePicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onFileSelect={handleGoogleFileSelect}
            />

            {uploaded ? (
                <div className="glass-card rounded-xl p-12 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                    <h3 className="text-xl font-semibold mb-2">Success!</h3>
                    <p className="text-muted-foreground mb-6">
                        The context item has been added to your project.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            className="border-white/10"
                            onClick={() => { setFile(null); setNotes(""); setUploaded(false); }}
                        >
                            Add Another
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
                        <div className="space-y-2">
                            <Label htmlFor="notes text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Project Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Describe what this context contains and how it should inform your documentation..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="bg-secondary/50 border-white/10 resize-none rounded-xl"
                            />
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#12141c] px-4 text-muted-foreground border border-white/5 rounded-full py-0.5">Or Upload Manual File</span>
                            </div>
                        </div>

                        {/* Drop zone */}
                        <div className="space-y-2">
                            <label
                                htmlFor="file"
                                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${file
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-white/10 hover:border-primary/30 hover:bg-white/3"
                                    }`}
                            >
                                {file ? (
                                    <>
                                        <FileText className="w-10 h-10 text-primary" />
                                        <div className="text-center">
                                            <div className="font-medium text-white/90">{file.name}</div>
                                            <div className="text-[11px] text-muted-foreground px-2 py-0.5 bg-white/5 rounded-full mt-1">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                        <span className="text-xs text-primary font-medium">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <Upload className="w-6 h-6 text-muted-foreground/60" />
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium">Click to select or drag a file</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                PDF, DOC, DOCX, TXT, MD
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
                    </div>

                    <div className="flex gap-3 justify-end items-center">
                        <p className="text-[10px] text-muted-foreground italic mr-auto max-w-[200px]">
                            Securely stored and used to ground your AI generated documets.
                        </p>
                        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Link href={`/projects/${projectId}/context`}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            className="gradient-primary shadow-lg shadow-primary/20 h-11 px-8 font-bold rounded-xl"
                            disabled={loading || !file}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" />Add Context</>
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

