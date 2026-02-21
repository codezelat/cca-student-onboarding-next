import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Login | CCA",
    description:
        "Sign in to the Codezela Career Accelerator admin portal to securely manage registrations and student data.",
    robots: "noindex, nofollow",
};

export default function AdminLoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="font-sans antialiased">
            {children}
            <style>{`
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
}
