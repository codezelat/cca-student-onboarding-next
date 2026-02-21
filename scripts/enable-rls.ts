import "dotenv/config";
import { Client } from "pg";

const tables = [
    "users",
    "cca_registrations",
    "programs",
    "program_intake_windows",
    "registration_payments",
    "admin_activity_logs",
];

const DIRECT_URL = process.env.DIRECT_URL;

if (!DIRECT_URL) {
    console.error("❌ Missing DIRECT_URL in .env");
    process.exit(1);
}

async function enableRLS() {
    const client = new Client({
        connectionString: DIRECT_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to DB to enable RLS...");

        for (const table of tables) {
            console.log(`Enabling RLS on table: ${table}`);

            // Enable RLS
            await client.query(
                `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`,
            );

            // Re-create default "allow all to service role" policy just in case
            // Although service role bypasses RLS, it's good practice to have explicit policies if public access is blocked.
            await client.query(`
                DROP POLICY IF EXISTS "Service role has full access" ON public."${table}";
                CREATE POLICY "Service role has full access" ON public."${table}"
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
            `);

            // By default, since no other policies exist, ALL other access (anon, authenticated) is DENIED.
            // This is exactly what we want since all our access is via Prisma (server-side).
        }

        console.log("✅ RLS enabled on all tables.");
        await client.end();
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error("❌ Failed to enable RLS:", e.message);
        } else {
            console.error("❌ Failed to enable RLS:", String(e));
        }
        process.exit(1);
    }
}

enableRLS();
