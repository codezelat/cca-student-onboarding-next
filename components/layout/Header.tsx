"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
    return (
        <nav className="relative z-10 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-3 group">
                    <img
                        src="/images/icon.png"
                        alt="Codezela"
                        className="w-10 h-10 transition-transform duration-300 group-hover:scale-110"
                    />
                    <div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent block">
                            CCA
                        </span>
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    <Link
                        href="/register"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-medium hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        Register Now
                    </Link>
                </div>
            </div>
        </nav>
    );
}
