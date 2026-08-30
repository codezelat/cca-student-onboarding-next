export interface TurnstileResult {
    success: boolean;
    errors: string[];
}

type TurnstileVerificationOptions = {
    remoteIp?: string;
    expectedAction?: string;
};

type SiteverifyResponse = {
    success?: boolean;
    hostname?: unknown;
    action?: unknown;
    ["error-codes"]?: unknown;
};

export class TurnstileService {
    async verify(
        token: string,
        { remoteIp, expectedAction }: TurnstileVerificationOptions = {},
    ): Promise<TurnstileResult> {
        if (process.env.NODE_ENV === "development" && token === "dev-bypass") {
            return { success: true, errors: [] };
        }

        const secret = process.env.TURNSTILE_SECRET_KEY;
        if (!token || token.length > 2048 || !secret) {
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
                    signal: AbortSignal.timeout(10_000),
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

            const data = (await res.json()) as SiteverifyResponse;
            const expectedHostname = process.env.TURNSTILE_ALLOWED_HOSTNAME?.trim();
            const hostnameMatches =
                !expectedHostname ||
                (typeof data.hostname === "string" && data.hostname === expectedHostname);
            const actionMatches =
                !expectedAction ||
                (typeof data.action === "string" && data.action === expectedAction);

            const errors = Array.isArray(data["error-codes"])
                ? data["error-codes"].filter(
                      (errorCode): errorCode is string => typeof errorCode === "string",
                  )
                : [];
            if (!hostnameMatches) errors.push("hostname-mismatch");
            if (!actionMatches) errors.push("action-mismatch");

            return {
                success: data.success === true && hostnameMatches && actionMatches,
                errors,
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
