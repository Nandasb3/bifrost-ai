"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck, Info, User, Mail, FileText, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";

function ConsentUI() {
    const searchParams = useSearchParams();
    const appName = searchParams.get("client_name") || "Third-party application";
    const [loading, setLoading] = useState(false);

    const handleAction = (approved: boolean) => {
        setLoading(true);
        // Supabase will usually handle the actual authorization logic. 
        // This UI is for the "Custom Authorization URL" configuration in Supabase.
        console.log(approved ? "Authorized" : "Denied");

        // In a real flow, you would redirect back to Supabase's internal auth endpoint
        // or a callback with the approval decision. For now, we're implementing the UI.

        // Simulating logic
        setTimeout(() => {
            setLoading(false);
            // In practice: 
            // const redirectUri = searchParams.get("redirect_uri");
            // window.location.href = approved ? `${redirectUri}?code=...` : `${redirectUri}?error=access_denied`;
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            {/* Gradient background matches sign-in */}
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.10_0.02_265)] via-[oklch(0.12_0.04_280)] to-[oklch(0.08_0.03_255)]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl opacity-50" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/8 blur-3xl opacity-50" />

            <div className="relative w-full max-w-lg mx-4">
                <div className="glass-card rounded-3xl p-8 md:p-10 border-white/5 shadow-2xl overflow-hidden relative">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />

                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="flex items-center justify-center gap-4 relative">
                            <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-white/10 flex items-center justify-center shadow-lg">
                                <Zap className="w-8 h-8 text-primary" />
                            </div>
                            <div className="h-0.5 w-12 bg-white/10 relative">
                                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-white/20 bg-[#12141c] rounded-full" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                                <div className="text-[10px] font-bold tracking-tighter text-primary-foreground/60 uppercase">App</div>
                                <ShieldCheck className="w-6 h-6 text-primary absolute opacity-20" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Authorize {appName}</h1>
                            <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                                This application is requesting access to your <span className="text-white font-medium">Bifrost</span> account.
                            </p>
                        </div>
                    </div>

                    {/* Permissions list */}
                    <div className="space-y-6 mb-10">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 border-b border-white/5 pb-2">
                            Requested Permissions
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 transition-colors group">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <User className="w-4 h-4 text-primary shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-semibold text-white/90">Profile Information</div>
                                    <div className="text-muted-foreground/70 text-xs leading-relaxed">View your name, avatar, and public profile data.</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 transition-colors group">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <Mail className="w-4 h-4 text-primary shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-semibold text-white/90">Email Address</div>
                                    <div className="text-muted-foreground/70 text-xs leading-relaxed">Access your primary email address for identification.</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 transition-colors group">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <FileText className="w-4 h-4 text-primary shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-semibold text-white/90">Document Metadata</div>
                                    <div className="text-muted-foreground/70 text-xs leading-relaxed">List and view details of your generated documentation.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info bar */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-10 text-[11px]">
                        <Info className="w-4 h-4 text-primary shrink-0" />
                        <p className="text-muted-foreground leading-relaxed">
                            You will be redirected back to <span className="text-white">{appName}</span> after granting access.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            variant="outline"
                            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 font-semibold h-12 order-2 sm:order-1 transition-all rounded-xl"
                            onClick={() => handleAction(false)}
                            disabled={loading}
                        >
                            Deny Access
                        </Button>
                        <Button
                            className="flex-1 gradient-primary font-bold h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 order-1 sm:order-2 transition-all rounded-xl"
                            onClick={() => handleAction(true)}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Authorize"
                            )}
                        </Button>
                    </div>

                    {/* Trust Seal */}
                    <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-widest font-bold">Encrypted Authorization</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ConsentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                    <Zap className="w-6 h-6 text-primary" />
                </div>
            </div>
        }>
            <ConsentUI />
        </Suspense>
    );
}
