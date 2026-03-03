import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
        return NextResponse.json({ error: "No provider token found" }, { status: 401 });
    }

    return NextResponse.json({ token: session.provider_token });
}
