"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Key, Save, Loader2, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("openai_api_key")
                .eq("id", user.id)
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
        const { data: { user } } = await supabase.auth.getUser();
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

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Profile Settings</h1>
                <p className="text-muted-foreground">Manage your personal preferences and AI configurations.</p>
            </div>

            <Card className="border-white/8 bg-sidebar/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>AI Configuration</CardTitle>
                            <CardDescription>Provide your own OpenAI API key to use for document generation.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">OpenAI API Key</label>
                        <div className="relative">
                            <Input
                                type={showKey ? "text" : "password"}
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pr-10 bg-background/50 border-white/8"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[12px] text-muted-foreground">
                            If provided, this key will be used instead of the system default for all AI operations.
                            Your key is stored in your private profile and is only used for your requests.
                        </p>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-4">
                <div className="text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                </div>
                <div>
                    <h4 className="font-semibold text-yellow-500">Security Note</h4>
                    <p className="text-sm text-yellow-500/80 mt-1">
                        Always use a "Restricted Key" if possible. While we take measures to protect your data,
                        providing API keys to third-party applications always carries inherent risks.
                    </p>
                </div>
            </div>
        </div>
    );
}
