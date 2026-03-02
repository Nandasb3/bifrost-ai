"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"signin" | "signup">("signin");

    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "signin") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = "/dashboard";
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
                });
                if (error) throw error;
                toast.success("Account created! Check your email to verify.");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Authentication failed";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.10_0.02_265)] via-[oklch(0.12_0.04_280)] to-[oklch(0.08_0.03_255)]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/8 blur-3xl" />

            <div className="relative w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-lg shadow-primary/30">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">Bifrost</h1>
                    <p className="text-muted-foreground text-sm">AI-First BA Documentation Platform</p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    <h2 className="text-xl font-semibold mb-6 text-center">
                        {mode === "signin" ? "Welcome back" : "Create your account"}
                    </h2>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-secondary/50 border-white/10"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full gradient-primary font-semibold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                            ) : (
                                mode === "signin" ? "Sign In" : "Create Account"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        {mode === "signin" ? (
                            <>Don&apos;t have an account?{" "}
                                <button
                                    onClick={() => setMode("signup")}
                                    className="text-primary hover:underline font-medium"
                                >Sign up</button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button
                                    onClick={() => setMode("signin")}
                                    className="text-primary hover:underline font-medium"
                                >Sign in</button>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Secure authentication powered by Supabase
                </p>
            </div>
        </div>
    );
}
