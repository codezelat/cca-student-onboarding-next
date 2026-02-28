export interface TurnstileResult {
    success: boolean;
    errors: string[];
}

export class TurnstileService {
    async verify(token: string, remoteIp?: string): Promise<TurnstileResult> {
        if (process.env.NODE_ENV === "development" && token === "dev-bypass") {
            return { success: true, errors: [] };
        }

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
                        ...(remoteIp ? { remoteip: remoteIp } : {}),
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
            const expectedHostname = process.env.TURNSTILE_ALLOWED_HOSTNAME?.trim();
            const hostnameMatches =
                !expectedHostname ||
                (typeof data.hostname === "string" && data.hostname === expectedHostname);

            return {
                success: data.success === true && hostnameMatches,
                errors: hostnameMatches
                    ? data["error-codes"] || []
                    : ["hostname-mismatch"],
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
