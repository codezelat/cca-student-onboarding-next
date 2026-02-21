import { notFound } from "next/navigation";
import {
    getRegistrationById,
    getActivePrograms,
} from "@/app/(admin)/admin/(dashboard)/dashboard-actions";
import EditRegistrationClient from "./edit-registration-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditRegistrationPage({ params }: PageProps) {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (isNaN(registrationId)) {
        notFound();
    }

    const [registration, programs] = await Promise.all([
        getRegistrationById(registrationId),
        getActivePrograms(),
    ]);

    if (!registration) {
        notFound();
    }

    return (
        <EditRegistrationClient
            registration={registration as any}
            programs={programs}
        />
    );
}
