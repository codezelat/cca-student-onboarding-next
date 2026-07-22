"use client";

import { useState } from "react";
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { formatAppDateLong } from "@/lib/formatters";

type CertificateVerification = {
  certificateNumber: string;
  studentName: string;
  result: string;
  issuedAt: string;
  program: {
    code: string;
    name: string;
    year: string;
  };
  moduleResults: Array<{
    code: string;
    name: string;
    credits: string | null;
    result: string;
  }>;
};

export default function CertificateVerificationPage() {
  const [certificateId, setCertificateId] = useState("");
  const [verification, setVerification] =
    useState<CertificateVerification | null>(null);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCertificateId = certificateId
      .replace(/\s+/g, "")
      .toUpperCase();

    if (normalizedCertificateId.length < 3) {
      setVerification(null);
      setError("Enter your certificate ID.");
      return;
    }

    setCertificateId(normalizedCertificateId);
    setIsVerifying(true);
    setError("");
    setVerification(null);

    try {
      const response = await fetch(
        `/api/certificates/verify?certificate_id=${encodeURIComponent(normalizedCertificateId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: CertificateVerification;
      };

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error || "Certificate could not be verified.");
        return;
      }

      setVerification(payload.data);
    } catch {
      setError("Unable to verify the certificate right now.");
    } finally {
      setIsVerifying(false);
    }
  }

  function verifyAnother() {
    setCertificateId("");
    setVerification(null);
    setError("");
  }

  return (
    <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_70%)]" />
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500 to-secondary-500 text-white shadow-xl shadow-primary-500/25">
            <ShieldCheck className="size-8" aria-hidden="true" />
          </div>
          <h1 className="bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            Certificate Verification
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-600 sm:text-lg">
            Verify a CCA certificate using its certificate ID.
          </p>
        </header>

        <div className="rounded-3xl border border-white/80 bg-white/65 p-5 shadow-2xl shadow-primary-950/10 backdrop-blur-xl sm:p-8">
          <form onSubmit={handleVerify} className="flex flex-col gap-4 sm:flex-row">
            <label className="sr-only" htmlFor="certificate-id">
              Certificate ID
            </label>
            <div className="relative flex-1">
              <Award className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary-500" />
              <input
                id="certificate-id"
                value={certificateId}
                onChange={(event) => {
                  setCertificateId(event.target.value.toUpperCase());
                  if (error) setError("");
                  if (verification) setVerification(null);
                }}
                placeholder="Enter Your Certificate ID"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={80}
                disabled={isVerifying}
                className="h-13 w-full rounded-2xl border border-white/90 bg-white/80 py-3 pl-12 pr-4 font-mono text-sm font-semibold tracking-wide text-gray-800 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-200/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              aria-busy={isVerifying}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-primary-500 to-secondary-500 px-6 font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:from-primary-600 hover:to-secondary-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="size-5" aria-hidden="true" />
              )}
              {isVerifying ? "Verifying" : "Verify"}
            </button>
          </form>
          {error ? (
            <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {verification ? (
          <div className="mt-6 overflow-hidden rounded-3xl border border-emerald-100 bg-white/75 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl" aria-live="polite">
            <div className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <BadgeCheck className="size-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">Certificate verified</p>
                  <p className="truncate font-mono text-xs font-bold tracking-wide text-emerald-700">
                    {verification.certificateNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={verifyAnother}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 sm:self-auto"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Verify another
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Certificate holder</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{verification.studentName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Overall result</p>
                  <p className="mt-1 inline-flex rounded-xl bg-primary-100 px-3 py-1 text-lg font-black text-primary-800">
                    {verification.result}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-primary-500" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-gray-900">{verification.program.name}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {verification.program.code}
                      {verification.program.year ? ` · ${verification.program.year}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600">
                <CalendarDays className="size-4 text-gray-400" aria-hidden="true" />
                Issued {formatAppDateLong(verification.issuedAt)}
              </div>

              {verification.moduleResults.length > 0 ? (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Module results</p>
                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    {verification.moduleResults.map((module) => (
                      <div key={module.code} className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 sm:px-5">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{module.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {module.code}
                            {module.credits ? ` · ${module.credits} credits` : ""}
                          </p>
                        </div>
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-black text-gray-800">{module.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
