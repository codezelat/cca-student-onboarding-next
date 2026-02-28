import Link from "next/link";
import Image from "next/image";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000" />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <div className="rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/90 shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-linear-to-r from-primary-500 via-secondary-500 to-primary-500" />
          <div className="p-8 sm:p-12 text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-white/80 border border-white/80 shadow-xl flex items-center justify-center">
              <Image
                src="/images/icon.png"
                alt="CCA"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                priority
              />
            </div>

            <p className="text-sm font-semibold tracking-widest uppercase text-primary-600">
              Error 404
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-800">
              Page not found
            </h1>
            <p className="mt-4 text-gray-600">
              The page you are looking for does not exist or was moved.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-linear-to-r from-primary-500 to-secondary-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Go to Home
              </Link>
              <Link
                href="/cca-register"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/80 border border-gray-200 text-gray-700 font-semibold hover:bg-white transition-all"
              >
                Go to Registration
              </Link>
            </div>
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
