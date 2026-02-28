import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRegisterId } from "@/lib/services/registration";
import { recaptchaService } from "@/lib/services/recaptcha";
import {
  beginIdempotency,
  checkRateLimit,
  createRequestHash,
  finalizeIdempotencyFailure,
  finalizeIdempotencySuccess,
} from "@/lib/server/public-api-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";
const REGISTRATION_ROUTE = "registrations:create";
const REGISTRATION_RATE_LIMIT = {
  limit: 5,
  windowSeconds: 15 * 60,
};

const qualificationValues = [
  "degree",
  "diploma",
  "postgraduate",
  "msc",
  "phd",
  "work_experience",
  "other",
] as const;

const registrationSchema = z.object({
  recaptchaToken: z.string().min(1),
  programId: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(2).max(150),
  nameWithInitials: z.string().trim().min(2).max(100),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().trim().min(1),
  nicNumber: z.string().trim().optional(),
  passportNumber: z.string().trim().optional(),
  nationality: z.string().trim().min(2).max(100),
  countryOfBirth: z.string().trim().min(2).max(100),
  countryOfResidence: z.string().trim().min(2).max(100),
  permanentAddress: z.string().trim().min(10).max(400),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(100),
  district: z.string().trim().optional(),
  province: z.string().trim().optional(),
  emailAddress: z.string().trim().email().max(320),
  whatsappNumber: z.string().trim().min(7).max(30),
  homeContactNumber: z.string().trim().optional(),
  guardianContactName: z.string().trim().min(2).max(150),
  guardianContactNumber: z.string().trim().min(7).max(30),
  highestQualification: z.enum(qualificationValues),
  qualificationOtherDetails: z.string().trim().optional(),
  qualificationStatus: z.enum(["completed", "ongoing"]),
  qualificationCompletedDate: z.string().trim().optional(),
  qualificationExpectedCompletionDate: z.string().trim().optional(),
  termsAccepted: z.literal("true"),
});

const urlArraySchema = z.array(z.string().url().max(2048)).max(10);

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }
  return date;
}

function parseUrlArray(raw: string | undefined, fieldName: string): string[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid ${fieldName} format`);
  }

  const result = urlArraySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid ${fieldName} values`);
  }
  return result.data;
}

export async function POST(request: Request) {
  let activeIdempotencyKey: string | null = null;

  try {
    const rateLimit = await checkRateLimit({
      request,
      route: REGISTRATION_ROUTE,
      limit: REGISTRATION_RATE_LIMIT.limit,
      windowSeconds: REGISTRATION_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please retry shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const formData = await request.formData();

    const rawPayload = {
      recaptchaToken: String(formData.get("recaptcha_token") || ""),
      programId: String(formData.get("program_id") || ""),
      fullName: String(formData.get("full_name") || ""),
      nameWithInitials: String(formData.get("name_with_initials") || ""),
      gender: String(formData.get("gender") || ""),
      dateOfBirth: String(formData.get("date_of_birth") || ""),
      nicNumber: toOptionalString(formData.get("nic_number")),
      passportNumber: toOptionalString(formData.get("passport_number")),
      nationality: String(formData.get("nationality") || ""),
      countryOfBirth: String(formData.get("country_of_birth") || ""),
      countryOfResidence: String(formData.get("country_of_residence") || ""),
      permanentAddress: String(formData.get("permanent_address") || ""),
      postalCode: String(formData.get("postal_code") || ""),
      country: String(formData.get("country") || ""),
      district: toOptionalString(formData.get("district")),
      province: toOptionalString(formData.get("province")),
      emailAddress: String(formData.get("email_address") || ""),
      whatsappNumber: String(formData.get("whatsapp_number") || ""),
      homeContactNumber: toOptionalString(formData.get("home_contact_number")),
      guardianContactName: String(formData.get("guardian_contact_name") || ""),
      guardianContactNumber: String(
        formData.get("guardian_contact_number") || "",
      ),
      highestQualification: String(formData.get("highest_qualification") || ""),
      qualificationOtherDetails: toOptionalString(
        formData.get("qualification_other_details"),
      ),
      qualificationStatus: String(formData.get("qualification_status") || ""),
      qualificationCompletedDate: toOptionalString(
        formData.get("qualification_completed_date"),
      ),
      qualificationExpectedCompletionDate: toOptionalString(
        formData.get("qualification_expected_completion_date"),
      ),
      termsAccepted: String(formData.get("terms_accepted") || "false"),
    };

    const parsed = registrationSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid submission data",
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    if (payload.nationality.toLowerCase() === "sri lankan" && !payload.nicNumber) {
      return NextResponse.json(
        { success: false, error: "NIC number is required for Sri Lankan nationals" },
        { status: 400 },
      );
    }

    if (payload.nationality.toLowerCase() !== "sri lankan" && !payload.passportNumber) {
      return NextResponse.json(
        { success: false, error: "Passport number is required for international students" },
        { status: 400 },
      );
    }

    if (payload.qualificationStatus === "completed" && !payload.qualificationCompletedDate) {
      return NextResponse.json(
        { success: false, error: "Qualification completed date is required" },
        { status: 400 },
      );
    }

    if (
      payload.qualificationStatus === "ongoing" &&
      !payload.qualificationExpectedCompletionDate
    ) {
      return NextResponse.json(
        { success: false, error: "Expected completion date is required for ongoing qualifications" },
        { status: 400 },
      );
    }

    if (
      payload.highestQualification === "other" &&
      !payload.qualificationOtherDetails
    ) {
      return NextResponse.json(
        { success: false, error: "Please provide details for the selected qualification" },
        { status: 400 },
      );
    }

    const academicUrls = parseUrlArray(
      toOptionalString(formData.get("academic_urls")),
      "academic document URLs",
    );
    const nicUrls = parseUrlArray(
      toOptionalString(formData.get("nic_urls")),
      "NIC document URLs",
    );
    const passportUrls = parseUrlArray(
      toOptionalString(formData.get("passport_urls")),
      "passport document URLs",
    );
    const photoUrl = toOptionalString(formData.get("photo_url"));
    const paymentUrl = toOptionalString(formData.get("payment_url"));

    if (!academicUrls.length) {
      return NextResponse.json(
        { success: false, error: "At least one academic document is required" },
        { status: 400 },
      );
    }
    if (!photoUrl || !z.string().url().safeParse(photoUrl).success) {
      return NextResponse.json(
        { success: false, error: "A valid passport photo upload is required" },
        { status: 400 },
      );
    }
    if (!paymentUrl || !z.string().url().safeParse(paymentUrl).success) {
      return NextResponse.json(
        { success: false, error: "A valid payment slip upload is required" },
        { status: 400 },
      );
    }

    if (payload.nicNumber && !nicUrls.length) {
      return NextResponse.json(
        { success: false, error: "NIC document upload is required when NIC number is provided" },
        { status: 400 },
      );
    }

    const hashablePayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== "recaptchaToken"),
    );
    const idempotencyState = await beginIdempotency({
      request,
      route: REGISTRATION_ROUTE,
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash({
        ...hashablePayload,
        academicUrls,
        nicUrls,
        passportUrls,
        photoUrl,
        paymentUrl,
      }),
      ttlSeconds: 24 * 60 * 60,
      inProgressTimeoutSeconds: 60,
    });

    if (idempotencyState.kind === "replay") {
      return NextResponse.json(idempotencyState.responseBody, {
        status: idempotencyState.httpStatus,
        headers: {
          "Idempotent-Replayed": "true",
        },
      });
    }

    if (idempotencyState.kind === "conflict") {
      return NextResponse.json(
        { success: false, error: idempotencyState.message },
        { status: 409 },
      );
    }

    if (idempotencyState.kind === "in_progress") {
      return NextResponse.json(
        { success: false, error: idempotencyState.message },
        { status: 409 },
      );
    }

    activeIdempotencyKey = idempotencyState.key;

    // 1. Verify reCAPTCHA
    const recaptchaResult = await recaptchaService.verify(payload.recaptchaToken);
    if (!recaptchaResult.success) {
      await finalizeIdempotencyFailure({
        key: activeIdempotencyKey!,
        httpStatus: 400,
        errorMessage: "Security check failed. Please try again.",
        ttlSeconds: 5 * 60,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Security check failed. Please try again.",
        },
        { status: 400 },
      );
    }

    const program = await prisma.program.findUnique({
      where: { code: payload.programId },
      select: {
        name: true,
        yearLabel: true,
        durationLabel: true,
        basePrice: true,
      },
    });

    if (!program) {
      await finalizeIdempotencyFailure({
        key: activeIdempotencyKey!,
        httpStatus: 400,
        errorMessage: "Selected program is invalid",
        ttlSeconds: 10 * 60,
      });
      return NextResponse.json(
        { success: false, error: "Selected program is invalid" },
        { status: 400 },
      );
    }

    const registerId = await generateRegisterId();
    const nowIso = new Date().toISOString();

    const registrationData = {
      registerId,
      programId: payload.programId,
      programName: program.name,
      programYear: program.yearLabel,
      programDuration: program.durationLabel,
      fullName: payload.fullName,
      nameWithInitials: payload.nameWithInitials,
      gender: payload.gender,
      dateOfBirth: parseDate(payload.dateOfBirth, "date of birth"),
      nicNumber: payload.nicNumber || null,
      passportNumber: payload.passportNumber || null,
      nationality: payload.nationality,
      countryOfBirth: payload.countryOfBirth,
      countryOfResidence: payload.countryOfResidence,
      permanentAddress: payload.permanentAddress,
      postalCode: payload.postalCode,
      country: payload.country,
      district: payload.district || null,
      province: payload.province || null,
      emailAddress: payload.emailAddress,
      whatsappNumber: payload.whatsappNumber,
      homeContactNumber: payload.homeContactNumber || null,
      guardianContactName: payload.guardianContactName,
      guardianContactNumber: payload.guardianContactNumber,
      highestQualification: payload.highestQualification,
      qualificationOtherDetails: payload.qualificationOtherDetails || null,
      qualificationStatus: payload.qualificationStatus,
      qualificationCompletedDate: payload.qualificationCompletedDate
        ? parseDate(payload.qualificationCompletedDate, "qualification completed date")
        : null,
      qualificationExpectedCompletionDate: payload.qualificationExpectedCompletionDate
        ? parseDate(
            payload.qualificationExpectedCompletionDate,
            "qualification expected completion date",
          )
        : null,
      academicQualificationDocuments: academicUrls.map((url) => ({ url })),
      nicDocuments: nicUrls.length ? nicUrls.map((url) => ({ url })) : undefined,
      passportDocuments: passportUrls.length
        ? passportUrls.map((url) => ({ url }))
        : undefined,
      passportPhoto: [{ url: photoUrl }],
      paymentSlip: [{ url: paymentUrl, uploadedAt: nowIso, status: "submitted" }],
      fullAmount: program.basePrice,
      currentPaidAmount: 0,
      termsAccepted: true,
    };

    const result = await prisma.cCARegistration.create({
      data: registrationData,
      select: { registerId: true },
    });

    const responseBody = {
      success: true,
      message: "Registration created successfully",
      registerId: result.registerId,
    };

    await finalizeIdempotencySuccess({
      key: activeIdempotencyKey!,
      httpStatus: 200,
      responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    if (activeIdempotencyKey) {
      try {
        await finalizeIdempotencyFailure({
          key: activeIdempotencyKey,
          httpStatus: 500,
          errorMessage: "Internal server error",
        });
      } catch (idempotencyError) {
        console.error("Registration idempotency failure update error:", idempotencyError);
      }
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
