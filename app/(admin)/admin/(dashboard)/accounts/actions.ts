"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAdminUsers() {
    const supabase = await createAdminClient();

    const {
        data: { users },
        error,
    } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching admin users:", error.message);
        return [];
    }

    // Filter for users who are actually admins (based on your metadata strategy)
    // For now, let's return all users in Auth since only admins are in Auth.
    return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "Unknown",
        role: user.user_metadata?.role || "admin",
        lastSignIn: user.last_sign_in_at,
        createdAt: user.created_at,
    }));
}

export async function createAdminUser(formData: FormData) {
    const supabase = await createAdminClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
        return { error: "All fields are required" };
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            name,
            role: "admin",
        },
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/accounts");
    return { success: true, user: data.user };
}

export async function deleteAdminUser(userId: string) {
    const supabase = await createAdminClient();

    // First, check how many admin users exist
    const {
        data: { users },
        error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
        return { error: "Failed to verify admin count: " + listError.message };
    }

    // Prevent deletion if this is the last admin account
    if (users.length <= 1) {
        return { 
            error: "Cannot delete the last admin account. At least one admin must remain to access the system." 
        };
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/accounts");
    return { success: true };
}
