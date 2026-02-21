import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Header />
            {/* Spacer to account for fixed header */}
            <div className="h-16 sm:h-20" />
            <main className="flex-grow flex flex-col">{children}</main>
            <Footer />
        </>
    );
}
