import { notFound } from "next/navigation";
import {
    getRegistrationById,
    getProgramsForRegistrationOptions,
} from "@/app/(admin)/admin/(dashboard)/dashboard-actions";
import EditRegistrationClient, {
    type EditRegistrationClientProps,
} from "./edit-registration-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

function toIsoDateString(value: string | Date | null | undefined): string {
    if (!value) return "";
    return value instanceof Date ? value.toISOString() : value;
}

function mapRegistrationForEditClient(
    registration: NonNullable<
        Awaited<ReturnType<typeof getRegistrationById>>
    >,
): EditRegistrationClientProps["registration"] {
    return {
        id: Number(registration.id),
        registerId: registration.registerId,
        fullName: registration.fullName,
        nameWithInitials: registration.nameWithInitials,
        gender: registration.gender,
        dateOfBirth: toIsoDateString(registration.dateOfBirth),
        nicNumber: registration.nicNumber,
        passportNumber: registration.passportNumber,
        nationality: registration.nationality,
        countryOfBirth: registration.countryOfBirth,
        emailAddress: registration.emailAddress,
        whatsappNumber: registration.whatsappNumber,
        homeContactNumber: registration.homeContactNumber,
        permanentAddress: registration.permanentAddress,
        district: registration.district,
        postalCode: registration.postalCode,
        country: registration.country,
        guardianContactName: registration.guardianContactName,
        guardianContactNumber: registration.guardianContactNumber,
        highestQualification: registration.highestQualification,
        qualificationStatus: registration.qualificationStatus,
        qualificationCompletedDate: toIsoDateString(
            registration.qualificationCompletedDate,
        ) || null,
        qualificationExpectedCompletionDate: toIsoDateString(
            registration.qualificationExpectedCompletionDate,
        ) || null,
        programId: registration.programId,
        programName: registration.programName ?? "",
        programYear: registration.programYear ?? "",
        programDuration: registration.programDuration ?? "",
        fullAmount:
            registration.fullAmount === null ||
            registration.fullAmount === undefined
                ? null
                : String(registration.fullAmount),
        currentPaidAmount:
            registration.currentPaidAmount === null ||
            registration.currentPaidAmount === undefined
                ? null
                : String(registration.currentPaidAmount),
        academicQualificationDocuments:
            registration.academicQualificationDocuments,
        nicDocuments: registration.nicDocuments,
        passportDocuments: registration.passportDocuments,
        passportPhoto: registration.passportPhoto,
        paymentSlip: registration.paymentSlip,
    };
}

export default async function EditRegistrationPage({ params }: PageProps) {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (isNaN(registrationId)) {
        notFound();
    }

    const [registration, programs] = await Promise.all([
        getRegistrationById(registrationId, { includePayments: false }),
        getProgramsForRegistrationOptions(),
    ]);

    if (!registration) {
        notFound();
    }

    return (
        <EditRegistrationClient
            registration={mapRegistrationForEditClient(registration)}
            programs={programs}
        />
    );
}
