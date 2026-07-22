import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative flex min-h-screen flex-col overflow-x-clip">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
        </div>
    );
}
