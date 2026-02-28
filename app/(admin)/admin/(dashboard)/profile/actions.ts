"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
    getAdminActorFromRequestHeaders,
    logActivitySafe,
} from "@/lib/server/activity-log";

const passwordChangeSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required."),
        newPassword: z
            .string()
            .min(12, "New password must be at least 12 characters.")
            .max(128, "New password must be 128 characters or fewer.")
            .regex(/[a-z]/, "New password must include a lowercase letter.")
            .regex(/[A-Z]/, "New password must include an uppercase letter.")
            .regex(/\d/, "New password must include a number.")
            .regex(
                /[^A-Za-z0-9]/,
                "New password must include a special character.",
            ),
        confirmPassword: z.string().min(1, "Please confirm your new password."),
    })
    .superRefine((value, context) => {
        if (value.newPassword !== value.confirmPassword) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["confirmPassword"],
                message: "New password and confirmation do not match.",
            });
        }

        if (value.currentPassword === value.newPassword) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newPassword"],
                message: "New password must be different from current password.",
            });
        }
    });

type PasswordFormFields = "currentPassword" | "newPassword" | "confirmPassword";

export type PasswordChangeState = {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Partial<Record<PasswordFormFields, string>>;
};

export async function changeOwnPasswordAction(
    _prevState: PasswordChangeState,
    formData: FormData,
): Promise<PasswordChangeState> {
    const actor = await getAdminActorFromRequestHeaders();
    const headerStore = await headers();
    const requestMeta = {
        routeName: "/admin/profile",
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

    const payload = {
        currentPassword: String(formData.get("currentPassword") || ""),
        newPassword: String(formData.get("newPassword") || ""),
        confirmPassword: String(formData.get("confirmPassword") || ""),
    };

    const parsed = passwordChangeSchema.safeParse(payload);
    if (!parsed.success) {
        const fieldErrors: Partial<Record<PasswordFormFields, string>> = {};
        for (const issue of parsed.error.issues) {
            const field = issue.path[0];
            if (
                (field === "currentPassword" ||
                    field === "newPassword" ||
                    field === "confirmPassword") &&
                !fieldErrors[field]
            ) {
                fieldErrors[field] = issue.message;
            }
        }

        await logActivitySafe({
            actor,
            category: "auth",
            action: "admin_password_change_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: actor.email || actor.name || "unknown",
            message: "Password change validation failed",
            ...requestMeta,
            meta: {
                fieldErrors: Object.keys(fieldErrors),
            },
        });

        return {
            success: false,
            error: "Please fix the highlighted fields and try again.",
            fieldErrors,
        };
    }

    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
        await logActivitySafe({
            actor,
            category: "auth",
            action: "admin_password_change_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: actor.email || actor.name || "unknown",
            message: "Password change failed because user session is invalid",
            ...requestMeta,
            meta: {
                reason: userError?.message || "missing_user",
            },
        });
        return {
            success: false,
            error: "Your session is no longer valid. Please sign in again.",
        };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.currentPassword,
    });

    if (verifyError) {
        await logActivitySafe({
            actor,
            category: "auth",
            action: "admin_password_change_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: user.email,
            message: "Password change rejected due to invalid current password",
            ...requestMeta,
        });
        return {
            success: false,
            error: "Current password is incorrect.",
            fieldErrors: {
                currentPassword: "Current password is incorrect.",
            },
        };
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
    });

    if (updateError) {
        await logActivitySafe({
            actor,
            category: "auth",
            action: "admin_password_change_failed",
            status: "failure",
            subjectType: "AdminSession",
            subjectLabel: user.email,
            message: "Password update failed at auth provider",
            ...requestMeta,
            meta: {
                reason: updateError.message,
            },
        });
        return {
            success: false,
            error:
                "Unable to update password right now. Please try again in a moment.",
        };
    }

    await logActivitySafe({
        actor,
        category: "auth",
        action: "admin_password_changed",
        status: "success",
        subjectType: "AdminSession",
        subjectLabel: user.email,
        message: "Admin updated own password",
        ...requestMeta,
        meta: {
            changedBy: "self",
        },
    });

    revalidatePath("/admin/profile");
    return {
        success: true,
        message: "Password updated successfully.",
    };
}
