"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/55 backdrop-blur-xl">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
      >
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white/80 shadow-sm shadow-primary-950/10 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/images/icon.png"
              alt="Codezela"
              width={40}
              height={40}
              className="size-7 object-contain"
            />
          </span>
          <div>
            <span className="block bg-linear-to-r from-primary-700 to-secondary-600 bg-clip-text text-lg font-bold leading-none text-transparent sm:text-xl">
              CCA
            </span>
            <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:block">
              Career Accelerator
            </span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/cca/certificate"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 text-sm font-semibold text-primary-700 shadow-sm shadow-primary-950/5 transition hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-md sm:px-4"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Verify Certificate</span>
            <span className="sm:hidden">Verify</span>
          </Link>
          <Link
            href="/cca-register"
            className="inline-flex h-10 items-center rounded-xl bg-linear-to-r from-primary-500 to-secondary-500 px-3 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition hover:-translate-y-0.5 hover:from-primary-600 hover:to-secondary-600 hover:shadow-lg sm:px-4"
          >
            <span className="hidden sm:inline">Register Now</span>
            <span className="sm:hidden">Register</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
