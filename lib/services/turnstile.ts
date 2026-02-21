export interface TurnstileResult {
    success: boolean;
    errors: string[];
}

export class TurnstileService {
    async verify(token: string): Promise<TurnstileResult> {
        const secret = process.env.TURNSTILE_SECRET_KEY;
        if (!token || !secret) {
            return { success: false, errors: ["missing-input"] };
        }

        try {
            const res = await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        secret,
                        response: token,
                    }),
                },
            );

            if (!res.ok) {
                return {
                    success: false,
                    errors: ["request-failed"],
                };
            }

            const data = await res.json();

            return {
                success: data.success === true,
                errors: data["error-codes"] || [],
            };
        } catch (error) {
            console.error("Turnstile validation error:", error);
            return {
                success: false,
                errors: ["validation-error"],
            };
        }
    }
}

export const turnstileService = new TurnstileService();
