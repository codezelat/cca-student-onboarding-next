import { notFound } from "next/navigation";
import { getRegistrationById } from "../../dashboard-actions";
import RegistrationDetailsClient from "./registration-details-client";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RegistrationDetailPage({
    params,
    searchParams,
}: PageProps) {
    const { id } = await params;
    const query = await searchParams;
    const registrationId = parseInt(id);
    const paymentsPage = Math.max(
        1,
        Number.isFinite(Number(query.payments_page))
            ? Number(query.payments_page)
            : 1,
    );

    if (isNaN(registrationId)) {
        notFound();
    }

    const registration = await getRegistrationById(registrationId, {
        paymentsPage,
        paymentsPageSize: 20,
    });

    if (!registration) {
        notFound();
    }

    return <RegistrationDetailsClient registration={registration as any} />;
}
