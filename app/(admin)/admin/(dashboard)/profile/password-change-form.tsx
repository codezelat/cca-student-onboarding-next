"use client";

import { useActionState, useEffect, useRef } from "react";
import {
    changeOwnPasswordAction,
    type PasswordChangeState,
} from "./actions";

export default function PasswordChangeForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const initialPasswordChangeState: PasswordChangeState = {
        success: false,
    };
    const [state, formAction, isPending] = useActionState(
        changeOwnPasswordAction,
        initialPasswordChangeState,
    );

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
        }
    }, [state.success]);

    return (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-linear-to-r from-indigo-500 to-primary-500">
                <h3 className="text-lg font-semibold text-white">
                    Change Password
                </h3>
                <p className="text-sm text-white/80">
                    Update your account password securely.
                </p>
            </div>

            <form ref={formRef} action={formAction} className="p-6 space-y-4">
                <div>
                    <label
                        htmlFor="currentPassword"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        Current Password
                    </label>
                    <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="w-full px-4 py-2.5 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                    />
                    {state.fieldErrors?.currentPassword && (
                        <p className="mt-1 text-xs text-red-600">
                            {state.fieldErrors.currentPassword}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        New Password
                    </label>
                    <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="w-full px-4 py-2.5 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                    />
                    {state.fieldErrors?.newPassword && (
                        <p className="mt-1 text-xs text-red-600">
                            {state.fieldErrors.newPassword}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        Confirm New Password
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="w-full px-4 py-2.5 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                    />
                    {state.fieldErrors?.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                            {state.fieldErrors.confirmPassword}
                        </p>
                    )}
                </div>

                <p className="text-xs text-gray-500">
                    Password must be at least 12 characters and include upper/lowercase letters, a number, and a special character.
                </p>

                {state.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {state.error}
                    </div>
                )}

                {state.success && state.message && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {state.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                    {isPending ? "Updating..." : "Update Password"}
                </button>
            </form>
        </div>
    );
}
