/**
 * Seed Admin User Script
 *
 * Creates the initial admin user in Supabase Auth.
 * Run with: npx tsx scripts/seed-admin.ts
 *
 * This only needs to be run once when setting up the project.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error(
        "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env",
    );
    process.exit(1);
}

// Use the secret key to access the admin API
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
        "❌ Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env",
    );
    process.exit(1);
}

async function seedAdmin() {
    const email = ADMIN_EMAIL;
    const password = ADMIN_PASSWORD;
    const name = ADMIN_NAME || "Admin User";

    console.log(`\n🔄 Creating admin user: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } =
        await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("❌ Failed to list users:", listError.message);
        console.error(
            "\n💡 Make sure your Supabase project is active and SUPABASE_SECRET_KEY is correct.",
        );
        process.exit(1);
    }

    const existingAdmin = existingUsers?.users?.find((u) => u.email === email);

    if (existingAdmin) {
        console.log(`✅ Admin user already exists: ${email}`);
        console.log(`   User ID: ${existingAdmin.id}`);
        return;
    }

    // Create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            name,
            role: "admin",
        },
    });

    if (error) {
        console.error("❌ Failed to create admin user:", error.message);
        process.exit(1);
    }

    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`\n⚠️  Change this password after first login!`);
}

seedAdmin().catch(console.error);
