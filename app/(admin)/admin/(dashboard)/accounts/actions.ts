"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
    getAdminActorFromRequestHeaders,
    logActivitySafe,
} from "@/lib/server/activity-log";

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
    const actor = await getAdminActorFromRequestHeaders();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
        await logActivitySafe({
            actor,
            category: "admin_account",
            action: "admin_account_create_validation_failed",
            status: "failure",
            subjectType: "AdminUser",
            subjectLabel: email || "unknown",
            message: "Attempted to create admin account with missing fields",
            routeName: "/admin/accounts",
        });
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
        await logActivitySafe({
            actor,
            category: "admin_account",
            action: "admin_account_create_failed",
            status: "failure",
            subjectType: "AdminUser",
            subjectLabel: email,
            message: "Failed to create admin account",
            routeName: "/admin/accounts",
            meta: { error: error.message },
        });
        return { error: error.message };
    }

    await logActivitySafe({
        actor,
        category: "admin_account",
        action: "admin_account_created",
        status: "success",
        subjectType: "AdminUser",
        subjectLabel: data.user?.email || email,
        message: "Admin account created",
        routeName: "/admin/accounts",
        afterData: {
            id: data.user?.id,
            email: data.user?.email,
            name,
            role: "admin",
        },
    });

    revalidatePath("/admin/accounts");
    return { success: true, user: data.user };
}

export async function deleteAdminUser(userId: string) {
    const supabase = await createAdminClient();
    const actor = await getAdminActorFromRequestHeaders();

    // First, check how many admin users exist
    const {
        data,
        error: listError,
    } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (listError) {
        await logActivitySafe({
            actor,
            category: "admin_account",
            action: "admin_account_delete_precheck_failed",
            status: "failure",
            subjectType: "AdminUser",
            subjectId: userId,
            subjectLabel: userId,
            message: "Failed to verify admin count before account deletion",
            routeName: "/admin/accounts",
            meta: { error: listError.message },
        });
        return { error: "Failed to verify admin count: " + listError.message };
    }

    // Prevent deletion if this is the last admin account
    if ((data.total ?? 0) <= 1) {
        await logActivitySafe({
            actor,
            category: "admin_account",
            action: "admin_account_delete_blocked_last_admin",
            status: "blocked",
            subjectType: "AdminUser",
            subjectId: userId,
            subjectLabel: userId,
            message: "Attempted to delete the final remaining admin account",
            routeName: "/admin/accounts",
            meta: { adminCount: data.total ?? 0 },
        });
        return { 
            error: "Cannot delete the last admin account. At least one admin must remain to access the system." 
        };
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        await logActivitySafe({
            actor,
            category: "admin_account",
            action: "admin_account_delete_failed",
            status: "failure",
            subjectType: "AdminUser",
            subjectId: userId,
            subjectLabel: userId,
            message: "Failed to delete admin account",
            routeName: "/admin/accounts",
            meta: { error: error.message },
        });
        return { error: error.message };
    }

    await logActivitySafe({
        actor,
        category: "admin_account",
        action: "admin_account_deleted",
        status: "success",
        subjectType: "AdminUser",
        subjectId: userId,
        subjectLabel: userId,
        message: "Admin account deleted",
        routeName: "/admin/accounts",
    });

    revalidatePath("/admin/accounts");
    return { success: true };
}
