"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="relative z-10 mt-auto border-t border-white/70 bg-white/45 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
                <Link href="/" className="group flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl border border-white/90 bg-white/80 shadow-sm shadow-primary-950/10 transition-transform duration-300 group-hover:scale-105">
                        <Image
                            src="/images/icon.png"
                            alt="Codezela"
                            width={28}
                            height={28}
                            className="size-6 object-contain"
                        />
                    </span>
                    <span>
                        <span className="block bg-linear-to-r from-primary-700 to-secondary-600 bg-clip-text text-sm font-bold text-transparent">
                            CCA
                        </span>
                        <span className="block text-xs text-gray-500">
                            Career Accelerator
                        </span>
                    </span>
                </Link>

                <div className="text-xs text-gray-500">
                    <p>
                        © {new Date().getFullYear()} Codezela Career Accelerator
                    </p>
                    <p className="mt-1">
                        Powered by{" "}
                        <a
                            href="https://codezela.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary-700 transition-colors hover:text-primary-900"
                        >
                            Codezela Technologies
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
