"use client";

import { useState } from "react";
import { createAdminUser, deleteAdminUser } from "./actions";
import { useRouter } from "next/navigation";
import { formatAppDate, formatAppDateTime } from "@/lib/formatters";
import { getPaginationRange } from "@/lib/pagination";

interface AdminUser {
    id: string;
    email: string | undefined;
    name: string;
    role: string;
    lastSignIn: string | undefined;
    createdAt: string;
}

export default function AdminAccountsList({
    initialUsers,
    currentPage,
    pageSize,
    totalPages,
    totalRows,
}: {
    initialUsers: AdminUser[];
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
}) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Delete confirmation modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const users = initialUsers;

    // Check if this is the last admin account
    const isLastAdmin = totalRows <= 1;
    const { start: paginationStart, end: paginationEnd } = getPaginationRange({
        currentPage,
        pageSize,
        totalRows,
    });

    async function handleAddAdmin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createAdminUser(formData);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            e.currentTarget.reset();
            setIsModalOpen(false);
            setIsLoading(false);
            router.refresh();
        }
    }

    function openDeleteModal(user: AdminUser) {
        // Prevent opening delete modal if this is the last admin
        if (isLastAdmin) {
            return;
        }
        setDeleteError(null);
        setUserToDelete(user);
        setDeleteModalOpen(true);
    }

    function closeDeleteModal() {
        setDeleteModalOpen(false);
        setUserToDelete(null);
        setIsDeleting(false);
        setDeleteError(null);
    }

    async function handleConfirmDelete() {
        if (!userToDelete) return;

        // Double-check on frontend
        if (isLastAdmin) {
            setDeleteError("Cannot delete the last admin account. At least one admin must remain.");
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);
        
        const result = await deleteAdminUser(userToDelete.id);
        if (result.error) {
            setDeleteError(result.error);
            setIsDeleting(false);
        } else {
            closeDeleteModal();
            router.refresh();
        }
    }

    function buildUrl(page: number) {
        return page > 1 ? `/admin/accounts?page=${page}` : "/admin/accounts";
    }

    return (
        <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                        Admin Accounts
                    </h1>
                    <p className="text-gray-600">
                        Manage administrator accounts and permissions
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2.5 bg-linear-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center space-x-2"
                >
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
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    <span>Add Admin</span>
                </button>
            </div>

            {/* Last Admin Warning Banner */}
            {isLastAdmin && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200 flex items-start gap-3">
                    <svg
                        className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            Only One Admin Account Remaining
                        </p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            You cannot delete the last admin account. Add another admin first if you need to remove this one.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Administrator
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Last Activity
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-gray-50/30 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 font-bold border border-white shadow-sm">
                                                {user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {user.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-100 capitalize">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {user.lastSignIn
                                            ? formatAppDateTime(
                                                  user.lastSignIn,
                                              )
                                            : "Never"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatAppDate(user.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        {isLastAdmin ? (
                                            // Disabled delete button with tooltip
                                            <div className="relative inline-block group">
                                                <button
                                                    disabled
                                                    className="text-gray-400 font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"
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
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                    Delete
                                                </button>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    Cannot delete the last admin account
                                                    <div className="absolute top-full right-8 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            // Active delete button
                                            <button
                                                onClick={() => openDeleteModal(user)}
                                                className="text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
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
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white/40">
                        <span className="text-sm text-gray-600">
                            Showing {paginationStart}-{paginationEnd} of{" "}
                            {totalRows} admins
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    router.push(buildUrl(currentPage - 1))
                                }
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() =>
                                    router.push(buildUrl(currentPage + 1))
                                }
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Admin Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-white/20">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xl font-bold text-gray-900">
                                Add New Administrator
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <form
                            onSubmit={handleAddAdmin}
                            className="p-6 space-y-4"
                        >
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    placeholder="e.g. admin@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Initial Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 bg-linear-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : null}
                                    Add Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                        onClick={closeDeleteModal}
                    ></div>
                    
                    <div className="relative w-full max-w-md transform transition-all">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-linear-to-r from-red-500/20 via-red-400/20 to-red-500/20 rounded-3xl blur-xl opacity-70"></div>
                        
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                            {/* Top Warning Bar */}
                            <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-red-500 via-red-400 to-red-500"></div>
                            
                            {/* Header */}
                            <div className="px-6 pt-8 pb-4 text-center">
                                {/* Warning Icon */}
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mb-4">
                                    <svg
                                        className="w-8 h-8 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                                
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    Delete Admin Account
                                </h3>
                                <p className="text-gray-600">
                                    This action cannot be undone. This will permanently delete the account.
                                </p>
                            </div>

                            {/* Error Message */}
                            {deleteError && (
                                <div className="mx-6 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
                                    <svg
                                        className="w-5 h-5 shrink-0"
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
                                    {deleteError}
                                </div>
                            )}

                            {/* User Info Card */}
                            <div className="mx-6 p-4 rounded-xl bg-gray-50/80 border border-gray-200/60">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 font-bold border border-white shadow-sm">
                                        {userToDelete.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {userToDelete.name}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {userToDelete.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning List */}
                            <div className="mx-6 mt-4 space-y-2">
                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                    <svg
                                        className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
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
                                    <span>All account data will be permanently removed</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                    <svg
                                        className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
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
                                    <span>Access to admin portal will be revoked immediately</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 pt-4 flex gap-3">
                                <button
                                    onClick={closeDeleteModal}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting || isLastAdmin}
                                    className="flex-1 py-3 bg-linear-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
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
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
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
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                            Delete Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
