"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    LayoutDashboard,
    FolderOpen,
    Zap,
    LogOut,
    ChevronRight,
    Menu,
    X,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

const topNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/sign-in";
        toast.success("Signed out");
    };

    const NavLinks = () => (
        <>
            <div className="flex items-center gap-2 px-4 py-5 border-b border-white/8">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg gradient-text">Bifrost</span>
            </div>

            <nav className="flex-1 p-3 space-y-1">
                {topNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{item.label}</span>
                            {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-white/8">
                <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all duration-150",
                        pathname === "/profile"
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    <User className="w-4 h-4" />
                    Profile Settings
                </Link>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen flex bg-background">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-56 border-r border-white/8 bg-sidebar fixed h-full z-20">
                <NavLinks />
            </aside>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-black/60"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative flex flex-col w-56 bg-sidebar z-50">
                        <NavLinks />
                    </aside>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
                {/* Mobile header */}
                <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-sidebar/80 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold gradient-text">Bifrost</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </header>

                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}
