"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(admin)/admin/actions";

interface AdminNavigationProps {
    userName: string;
    userEmail: string;
}

export default function AdminNavigation({
    userName,
    userEmail,
}: AdminNavigationProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const initial = userName.charAt(0).toUpperCase();

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuItems = [
        {
            label: "Dashboard",
            href: "/admin",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
            ),
        },
        {
            label: "Profile Settings",
            href: "/admin/profile",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
            ),
        },
        {
            label: "Finance Ledger",
            href: "/admin/finance",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            ),
        },
        {
            label: "Program Management",
            href: "/admin/programs",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13"
                />
            ),
        },
        {
            label: "Activity Timeline",
            href: "/admin/activity",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            ),
        },
        {
            label: "Admin Accounts",
            href: "/admin/accounts",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2m10 2v-2M12 7a4 4 0 100 8 4 4 0 000-8z"
                />
            ),
        },
    ];

    return (
        <nav className="bg-white/60 backdrop-blur-xl border-b border-white/60 shadow-sm relative z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link
                            prefetch={false}
                            href="/admin"
                            className="flex items-center space-x-3 group"
                        >
                            <div className="w-10 h-10 bg-linear-to-br from-primary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13"
                                    />
                                </svg>
                            </div>
                            <span className="text-xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                CCA Admin Area
                            </span>
                        </Link>
                    </div>

                    {/* Profile Dropdown */}
                    <div className="flex items-center space-x-4">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 hover:bg-white/60 transition-all duration-300 shadow-lg hover:shadow-xl group"
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-white font-semibold text-sm">
                                        {initial}
                                    </span>
                                </div>
                                {/* Name */}
                                <div className="hidden md:block text-left">
                                    <div className="text-sm font-semibold text-gray-800">
                                        {userName}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        Administrator
                                    </div>
                                </div>
                                {/* Dropdown Icon */}
                                <svg
                                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl bg-white/90 backdrop-blur-xl border border-white/60 overflow-hidden z-9999 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* User Info Header */}
                                    <div className="px-4 py-3 bg-linear-to-r from-primary-500 to-secondary-500">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <span className="text-white font-bold text-lg">
                                                    {initial}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">
                                                    {userName}
                                                </div>
                                                <div className="text-xs text-white/80">
                                                    {userEmail}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-2">
                                        {menuItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                prefetch={false}
                                                href={item.href}
                                                onClick={() =>
                                                    setDropdownOpen(false)
                                                }
                                                className={`flex items-center space-x-3 px-4 py-3 hover:bg-primary-50 transition-colors group ${pathname === item.href ? "bg-primary-50" : ""}`}
                                            >
                                                <svg
                                                    className={`w-5 h-5 transition-colors ${pathname === item.href ? "text-primary-600" : "text-gray-600 group-hover:text-primary-600"}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    {item.icon}
                                                </svg>
                                                <span
                                                    className={`text-sm font-medium transition-colors ${pathname === item.href ? "text-primary-600" : "text-gray-700 group-hover:text-primary-600"}`}
                                                >
                                                    {item.label}
                                                </span>
                                            </Link>
                                        ))}

                                        <div className="border-t border-gray-100 my-2"></div>

                                        {/* Logout */}
                                        <form action={logoutAction}>
                                            <button
                                                type="submit"
                                                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 transition-colors group text-left"
                                            >
                                                <svg
                                                    className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                    />
                                                </svg>
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">
                                                    Logout
                                                </span>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
