import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    // Only protect the admin area. Running proxy globally adds avoidable latency.
    matcher: ["/admin/:path*"],
};
