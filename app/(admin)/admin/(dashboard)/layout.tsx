import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNavigation from "@/components/admin/admin-navigation";

export const metadata: Metadata = {
  title: {
    template: "%s | CCA Admin",
    default: "Admin Dashboard | CCA",
  },
  description:
    "Internal dashboard for managing Codezela Career Accelerator operations.",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const userId = headerStore.get("x-admin-user-id");

  if (!userId) {
    redirect("/admin/login");
  }

  const encodedUserName = headerStore.get("x-admin-user-name");
  let userName = "Admin";

  if (encodedUserName) {
    try {
      userName = decodeURIComponent(encodedUserName);
    } catch {
      userName = encodedUserName;
    }
  }

  const userEmail = headerStore.get("x-admin-user-email") || "N/A";

  return (
    <div className="min-h-screen font-sans antialiased">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <AdminNavigation userName={userName} userEmail={userEmail} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <style>{`
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
    </div>
  );
}
