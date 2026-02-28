"use server";

import { createClient } from "@/lib/supabase/server";
import { turnstileService } from "@/lib/services/turnstile";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
    getAdminActorFromRequestHeaders,
    logActivitySafe,
} from "@/lib/server/activity-log";

export async function loginAction(formData: FormData) {
    const headerStore = await headers();
    const requestMeta = {
        routeName: "/admin/login",
        httpMethod: "POST",
        ipAddress:
            headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headerStore.get("x-real-ip") ||
            undefined,
        userAgent: headerStore.get("user-agent") || undefined,
        requestId:
            headerStore.get("x-request-id") ||
            headerStore.get("cf-ray") ||
            undefined,
    };
    const email = (formData.get("email") as string) || "";

    // 1. Verify Turnstile
    const turnstileToken =
        (formData.get("turnstile_token") as string) ||
        (formData.get("recaptcha_token") as string);

    if (!turnstileToken) {
        await logActivitySafe({
            actor: { email: email || null },
            category: "auth",
            action: "admin_login_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: email || "unknown",
            message: "Login rejected because security token was missing",
            ...requestMeta,
        });
        return { error: "Security verification failed. Please try again." };
    }

    const turnstileResult = await turnstileService.verify(
        turnstileToken,
        requestMeta.ipAddress,
    );

    if (!turnstileResult.success) {
        await logActivitySafe({
            actor: { email: email || null },
            category: "auth",
            action: "admin_login_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: email || "unknown",
            message: "Login rejected due to failed security challenge",
            ...requestMeta,
            meta: {
                errors: turnstileResult.errors,
            },
        });
        return { error: "Security check failed. Please try again." };
    }

    // 2. Authenticate with Supabase
    const supabase = await createClient();

    const password = formData.get("password") as string;

    if (!email || !password) {
        await logActivitySafe({
            actor: { email: email || null },
            category: "auth",
            action: "admin_login_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: email || "unknown",
            message: "Login rejected due to missing credentials",
            ...requestMeta,
        });
        return { error: "Email and password are required." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        await logActivitySafe({
            actor: { email },
            category: "auth",
            action: "admin_login_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: email,
            message: "Login failed due to invalid credentials",
            ...requestMeta,
            meta: {
                error: error.message,
            },
        });
        return { error: "Invalid email or password." };
    }

    await logActivitySafe({
        actor: { email },
        category: "auth",
        action: "admin_login_succeeded",
        status: "success",
        subjectType: "AdminSession",
        subjectLabel: email,
        message: "Admin signed in successfully",
        ...requestMeta,
    });

    redirect("/admin");
}

export async function logoutAction() {
    const actor = await getAdminActorFromRequestHeaders();
    const headerStore = await headers();
    const supabase = await createClient();
    await supabase.auth.signOut();
    await logActivitySafe({
        actor,
        category: "auth",
        action: "admin_logout",
        status: "success",
        subjectType: "AdminSession",
        subjectLabel: actor.email || actor.name || "unknown",
        message: "Admin signed out",
        routeName: "/admin/logout",
        httpMethod: "POST",
        ipAddress:
            headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headerStore.get("x-real-ip") ||
            undefined,
        userAgent: headerStore.get("user-agent") || undefined,
        requestId:
            headerStore.get("x-request-id") ||
            headerStore.get("cf-ray") ||
            undefined,
    });
    redirect("/admin/login");
}
