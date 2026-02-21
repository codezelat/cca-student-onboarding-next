import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_DOC_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

// Helper for file validations in Zod
const fileSchema = z
    .any()
    .refine(
        (file) => file instanceof File || typeof window === "undefined",
        "File is required",
    )
    .refine(
        (file) => !file || file.size <= MAX_FILE_SIZE,
        `Max file size is 5MB.`,
    );

export const registrationSchema = z
    .object({
        // STEP 1: Program Selection
        programId: z.string().min(1, "Please select a program"),

        // STEP 2: Personal Information
        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters")
            .max(150),
        nameWithInitials: z
            .string()
            .min(2, "Name with initials is required")
            .max(100),
        gender: z.enum(["male", "female"], {
            message: "Please select a gender",
        }),
        dateOfBirth: z.date({ message: "Date of birth is required" }),
        nationality: z.string().min(2, "Nationality is required"),
        nicNumber: z.string().optional(),
        passportNumber: z.string().optional(),
        countryOfBirth: z.string().min(2, "Country of birth is required"),
        countryOfResidence: z
            .string()
            .min(2, "Country of residence is required"),

        // STEP 3: Contact Details
        permanentAddress: z
            .string()
            .min(10, "Please provide a complete address"),
        postalCode: z.string().min(2, "Postal code is required"),
        country: z.string().min(2, "Country is required"),
        district: z.string().optional(),
        province: z.string().optional(),
        emailAddress: z.string().email("Invalid email address"),
        whatsappNumber: z.string().min(9, "Valid WhatsApp number is required"),
        homeContactNumber: z.string().optional(),
        guardianContactName: z.string().min(2, "Guardian name is required"),
        guardianContactNumber: z
            .string()
            .min(9, "Valid Guardian contact number is required"),

        // STEP 4: Educational Qualifications
        highestQualification: z.enum(
            [
                "degree",
                "diploma",
                "postgraduate",
                "msc",
                "phd",
                "work_experience",
                "other",
            ],
            {
                message: "Please select highest qualification",
            },
        ),
        qualificationOtherDetails: z.string().optional(),
        qualificationStatus: z.enum(["completed", "ongoing"], {
            message: "Please select status",
        }),
        qualificationCompletedDate: z.date().optional(),
        qualificationExpectedCompletionDate: z.date().optional(),

        // STEP 5: File Uploads
        // In a real app we upload first and store URLs, so here we just expect the URLs back or tracking state
        academicDocuments: z
            .array(z.string())
            .min(1, "At least one academic document is required"),
        identificationDocuments: z.array(z.string()).optional(), // NIC or Passport
        passportPhoto: z.string({
            message: "Passport photo is required",
        }),
        paymentSlip: z.string({ message: "Payment slip is required" }),

        // STEP 6: Agreement
        termsAccepted: z.literal(true, {
            message: "You must accept the terms and conditions",
        }),
    })
    .superRefine((data, ctx) => {
        // Cross-field validation: Must have either NIC or Passport
        if (data.nationality === "Sri Lankan" && !data.nicNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "NIC Number is required for Sri Lankan nationals",
                path: ["nicNumber"],
            });
        }

        if (data.nationality !== "Sri Lankan" && !data.passportNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "Passport Number is required for non-Sri Lankan nationals",
                path: ["passportNumber"],
            });
        }
    });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;
