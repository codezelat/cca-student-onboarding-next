import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

async function test() {
    // Check if cca_registrations table exists
    const { data: regData, error: regErr } = await supabase
        .from("cca_registrations")
        .select("id")
        .limit(1);
    console.log(
        "cca_registrations table:",
        regErr ? `NOT FOUND (${regErr.message})` : "EXISTS",
    );

    // Check if users table exists
    const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id")
        .limit(1);
    console.log(
        "users table:",
        userErr ? `NOT FOUND (${userErr.message})` : "EXISTS",
    );

    // Check if programs table exists
    const { data: progData, error: progErr } = await supabase
        .from("programs")
        .select("id")
        .limit(1);
    console.log(
        "programs table:",
        progErr ? `NOT FOUND (${progErr.message})` : "EXISTS",
    );

    // List auth users
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log("Auth users:", users?.users?.length, "users found");
    users?.users?.forEach((u) => console.log("  -", u.email, u.id));

    // Try running raw SQL via RPC
    const { data: version, error: vErr } = await supabase.rpc("version");
    console.log("DB version RPC:", vErr ? vErr.message : version);
}

test().catch(console.error);
