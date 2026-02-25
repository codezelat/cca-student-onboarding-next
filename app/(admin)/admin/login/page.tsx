"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { loginAction } from "../actions";

const isDev = process.env.NODE_ENV === "development";

function isNextRedirectError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    if (!("digest" in error)) {
        return false;
    }

    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export default function AdminLoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const recaptchaRef = useRef<ReCAPTCHA>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);

            if (!isDev) {
                // Execute reCAPTCHA in production only
                const token = await recaptchaRef.current?.executeAsync();
                if (!token) {
                    setError(
                        "reCAPTCHA verification failed. Please try again.",
                    );
                    setIsLoading(false);
                    return;
                }
                formData.set("recaptcha_token", token);
            } else {
                formData.set("recaptcha_token", "dev-bypass");
            }

            const result = await loginAction(formData);

            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
            }
        } catch (err) {
            if (isNextRedirectError(err)) {
                throw err;
            }

            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        } finally {
            if (recaptchaRef.current) recaptchaRef.current.reset();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background with Liquid Gradient Blobs */}
            <div className="fixed inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 overflow-hidden -z-10">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-[420px]">
                {/* Login Card with Glassmorphism */}
                <div className="relative group">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                    
                    <div className="relative p-8 md:p-10 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/90 shadow-2xl">
                        {/* Gradient Accent */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-t-3xl"></div>

                        {/* Logo & Header */}
                        <div className="text-center mb-8">
                            {/* Logo Card */}
                            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/90 shadow-xl flex items-center justify-center mb-5 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                                <img
                                    src="/images/icon.png"
                                    alt="Codezela"
                                    className="w-12 h-12"
                                />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                                Admin Portal
                            </h1>
                            <p className="text-gray-600">
                                Sign in to manage registrations
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200 flex items-start gap-3">
                                <svg
                                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Address */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-semibold text-gray-700"
                                >
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg
                                            className="w-5 h-5 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        className="w-full pl-11 pr-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-900 placeholder:text-gray-400"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-gray-700"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg
                                            className="w-5 h-5 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        className="w-full pl-11 pr-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-900 placeholder:text-gray-400"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        id="remember"
                                        type="checkbox"
                                        name="remember"
                                        className="w-4 h-4 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors"
                                    />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                                        Remember me
                                    </span>
                                </label>
                            </div>

                            {/* Invisible reCAPTCHA (production only) */}
                            {!isDev && (
                                <ReCAPTCHA
                                    ref={recaptchaRef}
                                    sitekey={
                                        process.env
                                            .NEXT_PUBLIC_RECAPTCHA_SITE_KEY!
                                    }
                                    size="invisible"
                                    badge="inline"
                                />
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:from-primary-600 hover:to-secondary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                            />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* reCAPTCHA Footer (production only) */}
                        {!isDev && (
                            <p className="mt-6 text-[11px] text-gray-400 text-center leading-relaxed">
                                This site is protected by reCAPTCHA and the
                                Google{" "}
                                <a
                                    href="https://policies.google.com/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-gray-600 transition-colors"
                                >
                                    Privacy Policy
                                </a>{" "}
                                and{" "}
                                <a
                                    href="https://policies.google.com/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-gray-600 transition-colors"
                                >
                                    Terms of Service
                                </a>{" "}
                                apply.
                            </p>
                        )}

                        {/* Back to Home */}
                        <div className="mt-6 pt-6 border-t border-gray-200/60 text-center">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/60">
                        <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        <span className="text-xs text-gray-600">
                            Secure login with encrypted connection
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
}
