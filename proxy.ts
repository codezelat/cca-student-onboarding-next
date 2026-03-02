import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    // Protect admin pages and admin APIs without applying proxy globally.
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
