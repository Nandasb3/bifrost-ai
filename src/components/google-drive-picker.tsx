"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Loader2, Cloud, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface GoogleFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    iconLink: string;
}

interface GoogleDrivePickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFileSelect: (file: { id: string, name: string, mimeType: string }) => void;
}

export function GoogleDrivePicker({ open, onOpenChange, onFileSelect }: GoogleDrivePickerProps) {
    const [files, setFiles] = useState<GoogleFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [token, setToken] = useState<string | null>(null);

    const fetchToken = async () => {
        try {
            const res = await fetch("/api/auth/google-token");
            const data = await res.json();
            if (data.token) {
                setToken(data.token);
                return data.token;
            }
            throw new Error("Google access token not found. Please sign in again.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to get Google access token");
            onOpenChange(false);
            return null;
        }
    };

    const fetchFiles = useCallback(async (tokenToUse: string, query: string = "") => {
        setLoading(true);
        try {
            const q = query
                ? `name contains '${query}' and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/pdf')`
                : `(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/pdf')`;

            const res = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,iconLink)&pageSize=20&orderBy=modifiedTime desc`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenToUse}`,
                    },
                }
            );
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setFiles(data.files || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to fetch files from Google Drive");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchToken().then(t => {
                if (t) fetchFiles(t);
            });
        }
    }, [open, fetchFiles]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (token) fetchFiles(token, search);
    };

    const getMimeBadge = (mime: string) => {
        if (mime.includes("document")) return <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Docs</Badge>;
        if (mime.includes("spreadsheet")) return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Sheets</Badge>;
        if (mime.includes("pdf")) return <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border-rose-500/20">PDF</Badge>;
        return null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl glass-card border-white/10 p-0 overflow-hidden sm:rounded-2xl">
                <div className="p-6 border-b border-white/10 bg-white/3">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            Google Drive
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Browse and select files from your Google Drive to use as project context.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search your Drive..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-secondary/50 border-white/10 h-11"
                        />
                        {loading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                    </form>
                </div>

                <ScrollArea className="h-[400px] p-2">
                    {files.length === 0 && !loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-10 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <p>No compatible files found.</p>
                            <p className="text-xs mt-1">Try searching or uploading a Google Doc/Sheet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {files.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => {
                                        onFileSelect(file);
                                        onOpenChange(false);
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <img src={file.iconLink} alt="" className="w-5 h-5 opacity-80" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white/90 truncate mr-2">{file.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] text-muted-foreground">
                                                Modified {new Date(file.modifiedTime).toLocaleDateString()}
                                            </span>
                                            {getMimeBadge(file.mimeType)}
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 bg-white/3 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Connected to Google</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
