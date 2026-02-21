import { notFound } from "next/navigation";
import { getRegistrationById } from "../../dashboard-actions";
import RegistrationDetailsClient from "./registration-details-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RegistrationDetailPage({ params }: PageProps) {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (isNaN(registrationId)) {
        notFound();
    }

    const registration = await getRegistrationById(registrationId);

    if (!registration) {
        notFound();
    }

    return <RegistrationDetailsClient registration={registration as any} />;
}
