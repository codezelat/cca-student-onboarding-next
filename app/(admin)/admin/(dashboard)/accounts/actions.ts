"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAdminUsers(params?: { page?: number; pageSize?: number }) {
    const supabase = await createAdminClient();
    const requestedPage = Math.max(1, params?.page ?? 1);
    const safePageSize = Math.min(Math.max(1, params?.pageSize ?? 20), 100);

    const {
        data,
        error,
    } = await supabase.auth.admin.listUsers({
        page: requestedPage,
        perPage: safePageSize,
    });

    if (error) {
        console.error("Error fetching admin users:", error.message);
        return {
            data: [],
            total: 0,
            page: 1,
            pageSize: safePageSize,
            totalPages: 1,
        };
    }

    // Filter for users who are actually admins (based on your metadata strategy)
    // For now, let's return all users in Auth since only admins are in Auth.
    const users = data.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "Unknown",
        role: user.user_metadata?.role || "admin",
        lastSignIn: user.last_sign_in_at,
        createdAt: user.created_at,
    }));

    const total = data.total ?? users.length;
    const totalPages = Math.max(1, data.lastPage ?? Math.ceil(total / safePageSize));
    const page = Math.min(requestedPage, totalPages);

    // If requested page is out of range, refetch the last available page.
    if (page !== requestedPage) {
        const { data: fallbackData, error: fallbackError } =
            await supabase.auth.admin.listUsers({
                page,
                perPage: safePageSize,
            });

        if (fallbackError) {
            console.error("Error fetching fallback admin page:", fallbackError.message);
            return {
                data: [],
                total,
                page: 1,
                pageSize: safePageSize,
                totalPages,
            };
        }

        return {
            data: fallbackData.users.map((user) => ({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || "Unknown",
                role: user.user_metadata?.role || "admin",
                lastSignIn: user.last_sign_in_at,
                createdAt: user.created_at,
            })),
            total,
            page,
            pageSize: safePageSize,
            totalPages,
        };
    }

    return {
        data: users,
        total,
        page,
        pageSize: safePageSize,
        totalPages,
    };
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
        data,
        error: listError,
    } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (listError) {
        return { error: "Failed to verify admin count: " + listError.message };
    }

    // Prevent deletion if this is the last admin account
    if ((data.total ?? 0) <= 1) {
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
