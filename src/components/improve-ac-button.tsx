"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
    storyId: string;
    projectId: string;
}

export function ImproveACButton({ storyId, projectId }: Props) {
    const [loading, setLoading] = useState(false);

    const handleImprove = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/stories/${storyId}/improve-ac`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Acceptance criteria improved! Refresh to see changes.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to improve AC");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs"
            onClick={handleImprove}
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
                <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Improve AC
        </Button>
    );
}
