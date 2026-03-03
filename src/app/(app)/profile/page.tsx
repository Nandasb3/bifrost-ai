"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Key, Save, Loader2, Eye, EyeOff, Mail, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
    console.log("ProfilePage loaded - debugging changes");
    const [user, setUser] = useState<any>(null);
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            setUser(authUser);

            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("openai_api_key")
                .eq("id", authUser.id)
                .maybeSingle();

            if (error) {
                console.error("Error loading profile:", error);
            } else if (data) {
                setApiKey(data.openai_api_key || "");
            }
            setLoading(false);
        }
        loadProfile();
    }, [supabase]);

    const handleSave = async () => {
        setSaving(true);
        if (!user) return;

        const { error } = await (supabase as any)
            .from("profiles")
            .upsert({
                id: user.id,
                openai_api_key: apiKey,
                updated_at: new Date().toISOString()
            });

        if (error) {
            toast.error("Failed to save settings: " + error.message);
        } else {
            toast.success("Profile settings updated");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Bifrost User";
    const email = user?.email;
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
            {/* Header / Identity Section */}
            <div className="relative group overflow-hidden glass-card rounded-3xl p-8 border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-70 transition-opacity" />

                <div className="flex flex-col md:flex-row items-center gap-8 relative">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full gradient-primary blur opacity-20 group-hover:opacity-40 transition-opacity" />
                        <Avatar className="w-24 h-24 border-2 border-white/10 shadow-xl">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-2xl font-bold bg-secondary/80 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0a0b10] flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <h1 className="text-3xl font-extrabold tracking-tight text-white transition-all">
                                {name} <span className="text-[10px] text-primary/50">(v2)</span>
                            </h1>
                            <Badge variant="outline" className="w-fit mx-auto md:mx-0 bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">PRO USER</Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                <Mail className="w-4 h-4 text-primary/70" />
                                <span className="text-white/80 font-medium">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-medium">
                                <ShieldCheck className="w-4 h-4" />
                                Secured Account
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-3 space-y-8">
                    {/* AI Configuration */}
                    <Card className="border-white/5 bg-sidebar/40 glass-card rounded-3xl overflow-hidden shadow-xl transition-all hover:shadow-2xl hover:border-white/10">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">AI Integration</CardTitle>
                                    <CardDescription className="text-muted-foreground/60">Customize your document generation engine.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">OpenAI API Key</label>
                                    <Badge variant="secondary" className="text-[9px] bg-white/5 font-medium">AES-256 ENCRYPTED</Badge>
                                </div>
                                <div className="relative group/input">
                                    <Input
                                        type={showKey ? "text" : "password"}
                                        placeholder="sk-..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="pr-12 bg-black/20 border-white/8 h-12 rounded-xl focus:ring-primary/20 transition-all hover:border-white/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-primary transition-colors"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground/50 leading-relaxed italic">
                                    Leaving this field empty will default to the Bifrost managed engine.
                                </p>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-12 gradient-primary font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all rounded-xl gap-2 text-md"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Apply Preferences
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="glass-card rounded-3xl border border-primary/10 bg-primary/5 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-bold text-white tracking-tight">Privacy First</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Bifrost is built with enterprise security at its core. Your documents, conversation context, and API keys are strictly sandboxed and never used for training.
                        </p>
                    </div>

                    <div className="glass-card rounded-3xl border border-yellow-500/10 bg-yellow-500/5 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            <h4 className="font-bold text-yellow-500/90 text-xs uppercase tracking-widest">Security Protocol</h4>
                        </div>
                        <p className="text-[11px] text-yellow-500/60 leading-relaxed">
                            Always rotate your API keys periodically. If you suspect any unauthorized access, revoke your keys immediately in the OpenAI dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
