import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRegisterId } from "@/lib/services/registration";
import { recaptchaService } from "@/lib/services/recaptcha";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        // 1. Verify reCAPTCHA
        const recaptchaToken = formData.get("recaptcha_token") as string;
        const recaptchaResult = await recaptchaService.verify(recaptchaToken);

        if (!recaptchaResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Security check failed. Please try again.",
                },
                { status: 400 },
            );
        }

        // Parse uploaded file URLs
        const academicUrlsStr = formData.get("academic_urls") as string;
        const nicUrlsStr = formData.get("nic_urls") as string;
        const passportUrlsStr = formData.get("passport_urls") as string;
        const photoUrl = formData.get("photo_url") as string;
        const paymentUrl = formData.get("payment_url") as string;

        const academicUrls: string[] = academicUrlsStr
            ? JSON.parse(academicUrlsStr)
            : [];
        const nicUrls: string[] = nicUrlsStr ? JSON.parse(nicUrlsStr) : [];
        const passportUrls: string[] = passportUrlsStr
            ? JSON.parse(passportUrlsStr)
            : [];

        const registerId = await generateRegisterId();

        const registrationData = {
            registerId: registerId,
            programId: formData.get("program_id") as string,
            programName: "Codezela Career Accelerator",
            programYear: "2025",
            programDuration: "6 Months",
            fullName: formData.get("full_name") as string,
            nameWithInitials: formData.get("name_with_initials") as string,
            gender: formData.get("gender") as "male" | "female",
            dateOfBirth: new Date(formData.get("date_of_birth") as string),
            nicNumber: (formData.get("nic_number") as string) || null,
            passportNumber: (formData.get("passport_number") as string) || null,
            nationality: formData.get("nationality") as string,
            countryOfBirth: formData.get("country_of_birth") as string,
            countryOfResidence: formData.get("country_of_residence") as string,
            permanentAddress: formData.get("permanent_address") as string,
            postalCode: formData.get("postal_code") as string,
            country: formData.get("country") as string,
            district: (formData.get("district") as string) || null,
            province: (formData.get("province") as string) || null,
            emailAddress: formData.get("email_address") as string,
            whatsappNumber: formData.get("whatsapp_number") as string,
            homeContactNumber:
                (formData.get("home_contact_number") as string) || null,
            guardianContactName: formData.get(
                "guardian_contact_name",
            ) as string,
            guardianContactNumber: formData.get(
                "guardian_contact_number",
            ) as string,
            highestQualification: formData.get("highest_qualification") as any,
            qualificationOtherDetails:
                (formData.get("qualification_other_details") as string) || null,
            qualificationStatus: formData.get("qualification_status") as any,
            qualificationCompletedDate: formData.get(
                "qualification_completed_date",
            )
                ? new Date(
                      formData.get("qualification_completed_date") as string,
                  )
                : null,
            qualificationExpectedCompletionDate: formData.get(
                "qualification_expected_completion_date",
            )
                ? new Date(
                      formData.get(
                          "qualification_expected_completion_date",
                      ) as string,
                  )
                : null,
            academicQualificationDocuments: academicUrls.map((url) => ({
                url,
            })),
            nicDocuments:
                nicUrls.length > 0
                    ? nicUrls.map((url) => ({ url }))
                    : undefined,
            passportDocuments:
                passportUrls.length > 0
                    ? passportUrls.map((url) => ({ url }))
                    : undefined,
            passportPhoto: [{ url: photoUrl }],
            paymentSlip: [{ url: paymentUrl }],
            termsAccepted: formData.get("terms_accepted") === "true",
        };

        const result = await prisma.cCARegistration.create({
            data: registrationData,
        });

        return NextResponse.json({
            success: true,
            message: "Registration created successfully",
            registerId: result.registerId,
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}
