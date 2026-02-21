export interface RecaptchaResult {
    success: boolean;
    score: number | null;
    errors: string[];
}

export class RecaptchaService {
    async verify(token: string): Promise<RecaptchaResult> {
        // Skip reCAPTCHA verification in development (localhost)
        if (process.env.NODE_ENV === "development") {
            return { success: true, score: 1.0, errors: [] };
        }

        const secret = process.env.RECAPTCHA_SECRET_KEY;
        if (!token || !secret) {
            return { success: false, score: null, errors: ["missing"] };
        }

        try {
            const res = await fetch(
                "https://www.google.com/recaptcha/api/siteverify",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({ secret, response: token }),
                },
            );

            if (!res.ok) {
                return {
                    success: false,
                    score: null,
                    errors: ["request-failed"],
                };
            }

            const data = await res.json();
            const threshold = parseFloat(
                process.env.RECAPTCHA_MINIMUM_SCORE || "0.5",
            );

            return {
                success: data.success && (data.score ?? 0) >= threshold,
                score: data.score ?? null,
                errors: data["error-codes"] || [],
            };
        } catch (error) {
            console.error("reCAPTCHA validation error:", error);
            return {
                success: false,
                score: null,
                errors: ["validation-error"],
            };
        }
    }
}

export const recaptchaService = new RecaptchaService();
