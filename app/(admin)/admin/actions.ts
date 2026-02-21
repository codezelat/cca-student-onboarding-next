"use server";

import { createClient } from "@/lib/supabase/server";
import { recaptchaService } from "@/lib/services/recaptcha";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    // 1. Verify reCAPTCHA
    const recaptchaToken = formData.get("recaptcha_token") as string;

    if (!recaptchaToken) {
        return { error: "Security verification failed. Please try again." };
    }

    const recaptchaResult = await recaptchaService.verify(recaptchaToken);

    if (!recaptchaResult.success) {
        return { error: "Security check failed. Please try again." };
    }

    // 2. Authenticate with Supabase
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: "Invalid email or password." };
    }

    redirect("/admin");
}

export async function logoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
}
