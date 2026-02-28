"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { COUNTRIES, SRI_LANKA_DISTRICTS } from "@/lib/data/registration";
import {
    ALLOWED_UPLOAD_ACCEPT,
    ALLOWED_UPLOAD_LABEL,
    MAX_UPLOAD_SIZE_BYTES,
    MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

const isDev = process.env.NODE_ENV === "development";

export default function RegisterPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<
        "idle" | "success" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<
        "idle" | "uploading" | "submitting"
    >("idle");

    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const { uploadFile } = useFileUpload();

    // Form State mapped exactly to Alpine.js implementation
    const [formData, setFormData] = useState({
        program_id: "",
        full_name: "",
        name_with_initials: "",
        gender: "",
        date_of_birth: "",
        nic_number: "",
        passport_number: "",
        nationality: "Sri Lankan",
        country_of_birth: "Sri Lanka",
        country_of_residence: "Sri Lanka",
        permanent_address: "",
        country: "Sri Lanka",
        postal_code: "",
        province: "",
        district: "",
        email_address: "",
        whatsapp_number: "",
        home_contact_number: "",
        guardian_contact_name: "",
        guardian_contact_number: "",
        highest_qualification: "",
        qualification_other_details: "",
        qualification_status: "",
        qualification_completed_date: "",
        qualification_expected_completion_date: "",
        terms_accepted: false,
    });

    const [uploadedFiles, setUploadedFiles] = useState({
        academic_1: null as File | null,
        academic_2: null as File | null,
        nic_1: null as File | null,
        nic_2: null as File | null,
        passport_1: null as File | null,
        passport_2: null as File | null,
        photo: null as File | null,
        payment: null as File | null,
    });

    const handleInputChange = (
        e: ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const val = type === "checkbox" ? checked : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
    };

    // Conditional districts logic
    const availableDistricts = formData.province
        ? SRI_LANKA_DISTRICTS[formData.province] || []
        : [];

    useEffect(() => {
        if (formData.country !== "Sri Lanka") {
            setFormData((prev) => ({ ...prev, province: "", district: "" }));
        }
    }, [formData.country]);

    useEffect(() => {
        if (
            formData.province &&
            !availableDistricts.includes(formData.district)
        ) {
            setFormData((prev) => ({ ...prev, district: "" }));
        }
    }, [formData.province, availableDistricts, formData.district]);

    const handleFileSelect = (
        e: ChangeEvent<HTMLInputElement>,
        fieldName: keyof typeof uploadedFiles,
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                alert(
                    `File "${file.name}" is too large!\n\nMaximum file size is ${MAX_UPLOAD_SIZE_MB}MB.\nYour file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.\n\nPlease compress or choose a smaller file.`,
                );
                e.target.value = "";
                setUploadedFiles((prev) => ({ ...prev, [fieldName]: null }));
                return;
            }
            setUploadedFiles((prev) => ({ ...prev, [fieldName]: file }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!formData.terms_accepted) {
            alert("You must accept the terms to proceed.");
            return;
        }

        // 1. ReCAPTCHA Verification (skip in dev)
        if (!isDev && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
            setErrorMessage(
                "reCAPTCHA is not configured. Submission disabled.",
            );
            setSubmitStatus("error");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus("idle");
        setErrorMessage("");
        setUploadStatus("uploading");
        setUploadProgress(0);

        try {
            let token = "dev-bypass";
            if (!isDev) {
                const recaptchaToken =
                    await recaptchaRef.current?.executeAsync();
                if (!recaptchaToken) {
                    throw new Error(
                        "reCAPTCHA verification failed. Please try again.",
                    );
                }
                token = recaptchaToken;
            }
            // Validations
            if (!uploadedFiles.academic_1)
                throw new Error(
                    "Please upload your academic qualification document.",
                );
            if (!uploadedFiles.photo)
                throw new Error("Please upload your passport-size photo.");
            if (!uploadedFiles.payment)
                throw new Error(
                    "Please upload your payment confirmation slip.",
                );

            if (formData.nic_number && !uploadedFiles.nic_1) {
                throw new Error(
                    "Please upload the front copy of your National ID.",
                );
            }

            type UploadTask = {
                slot: keyof typeof uploadedFiles;
                file: File;
                directory: "documents" | "receipts" | "avatars";
            };

            const uploadTasks: UploadTask[] = [];
            if (uploadedFiles.academic_1)
                uploadTasks.push({
                    slot: "academic_1",
                    file: uploadedFiles.academic_1,
                    directory: "documents",
                });
            if (uploadedFiles.academic_2)
                uploadTasks.push({
                    slot: "academic_2",
                    file: uploadedFiles.academic_2,
                    directory: "documents",
                });
            if (uploadedFiles.nic_1)
                uploadTasks.push({
                    slot: "nic_1",
                    file: uploadedFiles.nic_1,
                    directory: "documents",
                });
            if (uploadedFiles.nic_2)
                uploadTasks.push({
                    slot: "nic_2",
                    file: uploadedFiles.nic_2,
                    directory: "documents",
                });
            if (uploadedFiles.passport_1)
                uploadTasks.push({
                    slot: "passport_1",
                    file: uploadedFiles.passport_1,
                    directory: "documents",
                });
            if (uploadedFiles.passport_2)
                uploadTasks.push({
                    slot: "passport_2",
                    file: uploadedFiles.passport_2,
                    directory: "documents",
                });
            if (uploadedFiles.photo)
                uploadTasks.push({
                    slot: "photo",
                    file: uploadedFiles.photo,
                    directory: "avatars",
                });
            if (uploadedFiles.payment)
                uploadTasks.push({
                    slot: "payment",
                    file: uploadedFiles.payment,
                    directory: "receipts",
                });

            let completedUploads = 0;
            const totalUploads = uploadTasks.length;
            const uploadedMap = new Map<keyof typeof uploadedFiles, string>();

            await Promise.all(
                uploadTasks.map(async ({ slot, file, directory }) => {
                    const url = await uploadFile(file, directory);
                    uploadedMap.set(slot, url);
                    completedUploads += 1;
                    setUploadProgress(
                        Math.round((completedUploads / totalUploads) * 90),
                    );
                }),
            );

            const academicUrls = [
                uploadedMap.get("academic_1"),
                uploadedMap.get("academic_2"),
            ].filter(Boolean) as string[];
            const nicUrls = [uploadedMap.get("nic_1"), uploadedMap.get("nic_2")].filter(
                Boolean,
            ) as string[];
            const passportUrls = [
                uploadedMap.get("passport_1"),
                uploadedMap.get("passport_2"),
            ].filter(Boolean) as string[];
            const photoUrl = uploadedMap.get("photo") || "";
            const paymentUrl = uploadedMap.get("payment") || "";

            setUploadStatus("submitting");
            setUploadProgress(95);

            // Construct FormData payload for backend
            const submitData = new FormData();
            submitData.set("recaptcha_token", token);

            Object.entries(formData).forEach(([key, value]) => {
                submitData.set(key, String(value));
            });

            submitData.set("academic_urls", JSON.stringify(academicUrls));
            submitData.set("nic_urls", JSON.stringify(nicUrls));
            submitData.set("passport_urls", JSON.stringify(passportUrls));
            submitData.set("photo_url", photoUrl);
            submitData.set("payment_url", paymentUrl);
            const idempotencyKey =
                typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

            const response = await fetch("/api/registrations", {
                method: "POST",
                body: submitData,
                headers: {
                    "Idempotency-Key": idempotencyKey,
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Failed to submit registration",
                );
            }

            setUploadProgress(100);
            setSubmitStatus("success");
            setErrorMessage("");
        } catch (error: any) {
            console.error("Submission failed:", error);
            setErrorMessage(
                error.message ||
                    "Failed to submit registration. Please try again.",
            );
            setSubmitStatus("error");
            setUploadStatus("idle");
        } finally {
            setIsSubmitting(false);
            if (recaptchaRef.current) recaptchaRef.current.reset();
        }
    };

    return (
        <div className="relative min-h-screen py-6 sm:py-12 px-3 sm:px-6 lg:px-8 overflow-hidden text-gray-800 antialiased">
            {/* Glassmorphic Background with Purple Liquid Blobs */}
            <div className="fixed inset-0 bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 overflow-hidden -z-10">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div
                    className="absolute top-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
                    style={{ animationDelay: "2s" }}
                ></div>
                <div
                    className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
                    style={{ animationDelay: "4s" }}
                ></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="text-center mb-6 sm:mb-8">
                    <Link href="/" className="inline-block mb-4 sm:mb-6 group">
                        <Image
                            src="/images/logo-wide.png"
                            alt="Codezela Career Accelerator"
                            width={400}
                            height={80}
                            className="h-12 sm:h-16 md:h-20 object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                            priority
                        />
                    </Link>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2 sm:mb-3 px-2">
                        Codezela Career Accelerator
                    </h1>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-700 mb-3 sm:mb-4 px-2">
                        Registration Form
                    </h2>
                </div>

                {submitStatus === "success" ? (
                    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-2xl rounded-3xl p-8 sm:p-12 text-center text-gray-800">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                            <svg
                                className="w-12 h-12 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4">
                            Registration Submitted!
                        </h2>
                        <p className="text-lg text-gray-600 mb-8">
                            Thank you for registering. You will hear back from
                            our admissions team shortly.
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-8 py-4 rounded-xl bg-linear-to-r from-primary-500 to-secondary-500 text-white font-bold transition-transform hover:scale-105"
                        >
                            Return to Homepage
                        </Link>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6 sm:space-y-8 text-gray-800"
                    >
                        {/* Section 1: Program Information */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Program Information
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Enter your program ID provided by our
                                        team
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 Tip:</strong> Registering for
                                    multiple programs? Submit a separate
                                    registration form for each program.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="program_id"
                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                >
                                    Program ID{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="program_id"
                                    name="program_id"
                                    value={formData.program_id}
                                    onChange={handleInputChange}
                                    placeholder="Enter your program ID (E.g., CCA-PM25)"
                                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none uppercase"
                                    required
                                />
                            </div>
                        </div>

                        {/* Section 2: Personal Information */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Personal Information
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Enter your details exactly as they
                                        appear on your official documents
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label
                                        htmlFor="full_name"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Full Name{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name as per official documents"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="name_with_initials"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Name with Initials{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name_with_initials"
                                        name="name_with_initials"
                                        value={formData.name_with_initials}
                                        onChange={handleInputChange}
                                        placeholder="Enter name with initials"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="gender"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Gender{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="date_of_birth"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Date of Birth{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="date_of_birth"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleInputChange}
                                        max={
                                            new Date()
                                                .toISOString()
                                                .split("T")[0]
                                        }
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="nic_number"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        National ID / NIC Number{" "}
                                        <span className="text-gray-500 text-xs">
                                            (Sri Lankan students)
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nic_number"
                                        name="nic_number"
                                        value={formData.nic_number}
                                        onChange={handleInputChange}
                                        placeholder="Enter your NIC number"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="passport_number"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Passport Number{" "}
                                        <span className="text-gray-500 text-xs">
                                            (Required for international
                                            students)
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        id="passport_number"
                                        name="passport_number"
                                        value={formData.passport_number}
                                        onChange={handleInputChange}
                                        placeholder="Enter your passport number"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="nationality"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Nationality{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nationality"
                                        name="nationality"
                                        value={formData.nationality}
                                        onChange={handleInputChange}
                                        placeholder="Enter your nationality"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="country_of_birth"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Country of Birth{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="country_of_birth"
                                        name="country_of_birth"
                                        value={formData.country_of_birth}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        <option value="Sri Lanka">
                                            Sri Lanka
                                        </option>
                                        <option disabled>──────────</option>
                                        {COUNTRIES.map((country) => (
                                            <option
                                                key={country}
                                                value={country}
                                            >
                                                {country}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="country_of_residence"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Country of Permanent Residence{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="country_of_residence"
                                        name="country_of_residence"
                                        value={formData.country_of_residence}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        <option value="Sri Lanka">
                                            Sri Lanka
                                        </option>
                                        <option disabled>──────────</option>
                                        {COUNTRIES.map((country) => (
                                            <option
                                                key={country}
                                                value={country}
                                            >
                                                {country}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Contact Information */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Contact Information
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Provide accurate contact details
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label
                                        htmlFor="permanent_address"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Permanent Address{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="permanent_address"
                                        name="permanent_address"
                                        rows={3}
                                        value={formData.permanent_address}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full permanent address"
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="country"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Country{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            id="country"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        >
                                            <option value="">
                                                Select Country
                                            </option>
                                            <option value="Sri Lanka">
                                                Sri Lanka
                                            </option>
                                            <option disabled>──────────</option>
                                            {COUNTRIES.map((country) => (
                                                <option
                                                    key={country}
                                                    value={country}
                                                >
                                                    {country}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="postal_code"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Postal Code{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            id="postal_code"
                                            name="postal_code"
                                            value={formData.postal_code}
                                            onChange={handleInputChange}
                                            placeholder="Enter postal code"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    {formData.country === "Sri Lanka" && (
                                        <>
                                            <div>
                                                <label
                                                    htmlFor="province"
                                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                                >
                                                    Province{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </label>
                                                <select
                                                    id="province"
                                                    name="province"
                                                    value={formData.province}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                                    required
                                                >
                                                    <option value="">
                                                        Select Province
                                                    </option>
                                                    {Object.keys(
                                                        SRI_LANKA_DISTRICTS,
                                                    ).map((province) => (
                                                        <option
                                                            key={province}
                                                            value={province}
                                                        >
                                                            {province}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {formData.province && (
                                                <div>
                                                    <label
                                                        htmlFor="district"
                                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                                    >
                                                        District{" "}
                                                        <span className="text-red-500">
                                                            *
                                                        </span>
                                                    </label>
                                                    <select
                                                        id="district"
                                                        name="district"
                                                        value={
                                                            formData.district
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                                        required
                                                    >
                                                        <option value="">
                                                            Select District
                                                        </option>
                                                        {availableDistricts.map(
                                                            (district) => (
                                                                <option
                                                                    key={
                                                                        district
                                                                    }
                                                                    value={
                                                                        district
                                                                    }
                                                                >
                                                                    {district}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="email_address"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Email Address{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email_address"
                                            name="email_address"
                                            value={formData.email_address}
                                            onChange={handleInputChange}
                                            placeholder="Enter your email address"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="whatsapp_number"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            WhatsApp Number{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="whatsapp_number"
                                            name="whatsapp_number"
                                            value={formData.whatsapp_number}
                                            onChange={handleInputChange}
                                            placeholder="Enter your WhatsApp number"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="home_contact_number"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Home Contact Number{" "}
                                            <span className="text-gray-400 text-xs">
                                                (optional)
                                            </span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="home_contact_number"
                                            name="home_contact_number"
                                            value={formData.home_contact_number}
                                            onChange={handleInputChange}
                                            placeholder="Enter home/landline number (optional)"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="guardian_contact_name"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Guardian/Emergency Contact Name{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            id="guardian_contact_name"
                                            name="guardian_contact_name"
                                            value={
                                                formData.guardian_contact_name
                                            }
                                            onChange={handleInputChange}
                                            placeholder="Enter guardian or emergency contact name"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="guardian_contact_number"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            Guardian/Emergency Contact Number{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="guardian_contact_number"
                                            name="guardian_contact_number"
                                            value={
                                                formData.guardian_contact_number
                                            }
                                            onChange={handleInputChange}
                                            placeholder="Enter contact number with country code"
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Qualification Information */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Qualification Information
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Tell us about your educational
                                        background or work experience
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label
                                        htmlFor="highest_qualification"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Highest Qualification{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="highest_qualification"
                                        name="highest_qualification"
                                        value={formData.highest_qualification}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                        required
                                    >
                                        <option value="">
                                            Select Qualification
                                        </option>
                                        <option value="phd">
                                            PhD / Doctorate
                                        </option>
                                        <option value="msc">
                                            Master&apos;s Degree (MSc/MBA/MA)
                                        </option>
                                        <option value="postgraduate">
                                            Postgraduate Diploma
                                        </option>
                                        <option value="degree">
                                            Bachelor&apos;s Degree
                                        </option>
                                        <option value="diploma">Diploma</option>
                                        <option value="work_experience">
                                            Professional Work Experience
                                        </option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {(formData.highest_qualification === "other" ||
                                    formData.highest_qualification ===
                                        "work_experience") && (
                                    <div>
                                        <label
                                            htmlFor="qualification_other_details"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            {formData.highest_qualification ===
                                            "other"
                                                ? "Please Specify Your Qualification"
                                                : "Company/Organization Name"}{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            id="qualification_other_details"
                                            name="qualification_other_details"
                                            value={
                                                formData.qualification_other_details
                                            }
                                            onChange={handleInputChange}
                                            placeholder={
                                                formData.highest_qualification ===
                                                "work_experience"
                                                    ? "Enter your current or most recent employer"
                                                    : "Describe your qualification"
                                            }
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="qualification_status"
                                            className="block text-sm font-semibold text-gray-700 mb-2"
                                        >
                                            {formData.highest_qualification ===
                                            "work_experience"
                                                ? "Employment Status"
                                                : "Qualification Status"}{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            id="qualification_status"
                                            name="qualification_status"
                                            value={
                                                formData.qualification_status
                                            }
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                            required
                                        >
                                            <option value="">
                                                Select Status
                                            </option>
                                            {formData.highest_qualification ===
                                            "work_experience" ? (
                                                <optgroup label="Employment Status">
                                                    <option value="completed">
                                                        Left/Completed
                                                    </option>
                                                    <option value="ongoing">
                                                        Currently Working
                                                    </option>
                                                </optgroup>
                                            ) : (
                                                <optgroup label="Study Status">
                                                    <option value="completed">
                                                        Completed
                                                    </option>
                                                    <option value="ongoing">
                                                        Currently Pursuing
                                                    </option>
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

                                    {formData.qualification_status ===
                                        "completed" && (
                                        <div>
                                            <label
                                                htmlFor="qualification_completed_date"
                                                className="block text-sm font-semibold text-gray-700 mb-2"
                                            >
                                                {formData.highest_qualification ===
                                                "work_experience"
                                                    ? "Employment End Date"
                                                    : "Date of Completion"}{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                id="qualification_completed_date"
                                                name="qualification_completed_date"
                                                value={
                                                    formData.qualification_completed_date
                                                }
                                                onChange={handleInputChange}
                                                max={
                                                    new Date()
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    )}

                                    {formData.qualification_status ===
                                        "ongoing" && (
                                        <div>
                                            <label
                                                htmlFor="qualification_expected_completion_date"
                                                className="block text-sm font-semibold text-gray-700 mb-2"
                                            >
                                                {formData.highest_qualification ===
                                                "work_experience"
                                                    ? "Employment Start Date"
                                                    : "Expected Completion Date"}{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                id="qualification_expected_completion_date"
                                                name="qualification_expected_completion_date"
                                                value={
                                                    formData.qualification_expected_completion_date
                                                }
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Required Documents */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Required Documents
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Upload clear copies of your documents
                                        (Max {MAX_UPLOAD_SIZE_MB}MB per file)
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Academic Docs */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-800 mb-4">
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="w-5 h-5 text-primary-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            Academic or Work Qualification Proof{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </span>
                                        <span className="text-xs font-normal text-gray-600 mt-1 block">
                                            Upload your degree, diploma, or
                                            experience letter (up to 2 files)
                                        </span>
                                    </label>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="block upload-area group/upload">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept={ALLOWED_UPLOAD_ACCEPT}
                                                    onChange={(e) =>
                                                        handleFileSelect(
                                                            e,
                                                            "academic_1",
                                                        )
                                                    }
                                                />
                                                {!uploadedFiles.academic_1 ? (
                                                    <div className="text-center">
                                                        <svg
                                                            className="w-12 h-12 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                            />
                                                        </svg>
                                                        <p className="mt-3 text-sm font-semibold text-gray-700">
                                                            Click to upload
                                                            Document #1
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {ALLOWED_UPLOAD_LABEL} • Max {MAX_UPLOAD_SIZE_MB}MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <svg
                                                            className="w-8 h-8 text-green-500 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {
                                                                    uploadedFiles
                                                                        .academic_1
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Click to change
                                                                file
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <label className="block upload-area-optional group/upload">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept={ALLOWED_UPLOAD_ACCEPT}
                                                    onChange={(e) =>
                                                        handleFileSelect(
                                                            e,
                                                            "academic_2",
                                                        )
                                                    }
                                                />
                                                {!uploadedFiles.academic_2 ? (
                                                    <div className="text-center">
                                                        <svg
                                                            className="w-10 h-10 mx-auto text-gray-400 group-hover/upload:text-primary-500 transition-colors"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M12 4v16m8-8H4"
                                                            />
                                                        </svg>
                                                        <p className="mt-2 text-sm font-medium text-gray-600">
                                                            Add Document #2
                                                            (Optional)
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {ALLOWED_UPLOAD_LABEL} • Max {MAX_UPLOAD_SIZE_MB}MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <svg
                                                            className="w-8 h-8 text-green-500 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {
                                                                    uploadedFiles
                                                                        .academic_2
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Click to change
                                                                file
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* NIC Documents - show only when NIC number is provided */}
                                {formData.nic_number && (
                                    <div className="group transition-all duration-300">
                                        <label className="block text-sm font-semibold text-gray-800 mb-4">
                                            <span className="flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-primary-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                                    />
                                                </svg>
                                                National ID Copy{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-xs font-normal text-gray-600 mt-1 block">
                                                Upload both sides of your NIC
                                                (Front & Back)
                                            </span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <label className="block upload-area group/upload">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept={ALLOWED_UPLOAD_ACCEPT}
                                                        onChange={(e) =>
                                                            handleFileSelect(
                                                                e,
                                                                "nic_1",
                                                            )
                                                        }
                                                        required={
                                                            !!formData.nic_number
                                                        }
                                                    />
                                                    {!uploadedFiles.nic_1 ? (
                                                        <div className="text-center">
                                                            <svg
                                                                className="w-10 h-10 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                            <p className="mt-2 text-xs font-semibold text-gray-700">
                                                                NIC Front
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ALLOWED_UPLOAD_LABEL}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <svg
                                                                className="w-8 h-8 mx-auto text-green-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            <p className="text-xs font-semibold text-gray-900 mt-2 truncate px-2">
                                                                {
                                                                    uploadedFiles
                                                                        .nic_1
                                                                        .name
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            <div className="relative">
                                                <label className="block upload-area group/upload">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept={ALLOWED_UPLOAD_ACCEPT}
                                                        onChange={(e) =>
                                                            handleFileSelect(
                                                                e,
                                                                "nic_2",
                                                            )
                                                        }
                                                        required={
                                                            !!formData.nic_number
                                                        }
                                                    />
                                                    {!uploadedFiles.nic_2 ? (
                                                        <div className="text-center">
                                                            <svg
                                                                className="w-10 h-10 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                            <p className="mt-2 text-xs font-semibold text-gray-700">
                                                                NIC Back
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ALLOWED_UPLOAD_LABEL}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <svg
                                                                className="w-8 h-8 mx-auto text-green-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            <p className="text-xs font-semibold text-gray-900 mt-2 truncate px-2">
                                                                {
                                                                    uploadedFiles
                                                                        .nic_2
                                                                        .name
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Passport Document - show only when passport is provided and no NIC */}
                                {formData.passport_number &&
                                    !formData.nic_number && (
                                        <div className="group transition-all duration-300">
                                            <label className="block text-sm font-semibold text-gray-800 mb-4">
                                                <span className="flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-primary-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                        />
                                                    </svg>
                                                    Passport Copy{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </span>
                                                <span className="text-xs font-normal text-gray-600 mt-1 block">
                                                    Upload the information page
                                                    of your passport
                                                </span>
                                            </label>
                                            <label className="block upload-area group/upload">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept={ALLOWED_UPLOAD_ACCEPT}
                                                    onChange={(e) =>
                                                        handleFileSelect(
                                                            e,
                                                            "passport_1",
                                                        )
                                                    }
                                                    required
                                                />
                                                {!uploadedFiles.passport_1 ? (
                                                    <div className="text-center">
                                                        <svg
                                                            className="w-12 h-12 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <p className="mt-3 text-sm font-semibold text-gray-700">
                                                            Upload Passport
                                                            Information Page
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {ALLOWED_UPLOAD_LABEL} • Max {MAX_UPLOAD_SIZE_MB}MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <svg
                                                            className="w-8 h-8 text-green-500 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {
                                                                    uploadedFiles
                                                                        .passport_1
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Click to change
                                                                file
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    )}

                                {/* Passport Size Photo & Payment Slip */}
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Passport Size Photo */}
                                        <div className="group">
                                            <label className="block text-sm font-semibold text-gray-800 mb-4">
                                                <span className="flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-primary-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                        />
                                                    </svg>
                                                    Passport-Size Photo (2x2
                                                    inch){" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </span>
                                                <span className="text-xs font-normal text-gray-600 mt-1 block">
                                                    Recent color photo for your
                                                    student ID card
                                                </span>
                                            </label>
                                            <label className="block upload-area group/upload">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".jpg,.jpeg,.png"
                                                    onChange={(e) =>
                                                        handleFileSelect(
                                                            e,
                                                            "photo",
                                                        )
                                                    }
                                                    required
                                                />
                                                {!uploadedFiles.photo ? (
                                                    <div className="text-center">
                                                        <svg
                                                            className="w-12 h-12 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <p className="mt-3 text-sm font-semibold text-gray-700">
                                                            Upload Your Photo
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            JPG, JPEG, PNG • Max {MAX_UPLOAD_SIZE_MB}MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <svg
                                                            className="w-8 h-8 text-green-500 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {
                                                                    uploadedFiles
                                                                        .photo
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Click to change
                                                                photo
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>

                                        {/* Payment Slip */}
                                        <div className="group">
                                            <label className="block text-sm font-semibold text-gray-800 mb-4">
                                                <span className="flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-primary-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
                                                        />
                                                    </svg>
                                                    Payment Confirmation Slip{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </span>
                                                <span className="text-xs font-normal text-gray-600 mt-1 block">
                                                    Upload proof of payment for
                                                    program registration fee
                                                </span>
                                            </label>
                                            <label className="block upload-area group/upload">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept={ALLOWED_UPLOAD_ACCEPT}
                                                    onChange={(e) =>
                                                        handleFileSelect(
                                                            e,
                                                            "payment",
                                                        )
                                                    }
                                                    required
                                                />
                                                {!uploadedFiles.payment ? (
                                                    <div className="text-center">
                                                        <svg
                                                            className="w-12 h-12 mx-auto text-primary-400 group-hover/upload:text-primary-600 transition-colors"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                            />
                                                        </svg>
                                                        <p className="mt-3 text-sm font-semibold text-gray-700">
                                                            Upload Payment Slip
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {ALLOWED_UPLOAD_LABEL} • Max {MAX_UPLOAD_SIZE_MB}MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <svg
                                                            className="w-8 h-8 text-green-500 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {
                                                                    uploadedFiles
                                                                        .payment
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Click to change
                                                                file
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8">
                            <div className="p-5 rounded-xl bg-linear-to-br from-primary-50 to-secondary-50 border-2 border-primary-200 mb-6">
                                <div className="flex items-start gap-4">
                                    <input
                                        type="checkbox"
                                        id="terms_accepted"
                                        name="terms_accepted"
                                        checked={formData.terms_accepted}
                                        onChange={handleInputChange}
                                        className="mt-1.5 w-5 h-5 rounded border-primary-300 text-primary-600 focus:ring-primary-500 focus:ring-2 shrink-0 cursor-pointer"
                                    />
                                    <label
                                        htmlFor="terms_accepted"
                                        className="text-sm text-gray-800 cursor-pointer select-none"
                                    >
                                        <span className="font-semibold">
                                            I confirm that all information
                                            provided is true and accurate.
                                        </span>
                                        <p className="text-gray-600 mt-1 text-xs">
                                            I understand false information may
                                            result in application rejection. I
                                            agree to abide by all institution
                                            rules and regulations.
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {submitStatus === "error" && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
                                    ⚠️ {errorMessage}
                                </div>
                            )}

                            {isSubmitting && uploadStatus !== "idle" && (
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm font-semibold mb-1 text-primary-700">
                                        <span>
                                            {uploadStatus === "uploading"
                                                ? "Uploading Documents..."
                                                : "Finalizing Registration..."}
                                        </span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-linear-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${uploadProgress}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {!isDev && (
                                <div className="fixed -bottom-[9999px] -left-[9999px] invisible">
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={
                                            process.env
                                                .NEXT_PUBLIC_RECAPTCHA_SITE_KEY!
                                        }
                                        size="invisible"
                                        badge="inline"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    isSubmitting || !formData.terms_accepted
                                }
                                className="w-full px-8 py-5 rounded-2xl bg-linear-to-r from-primary-500 to-secondary-500 text-white font-bold text-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Submit Registration
                                        <svg
                                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                                            />
                                        </svg>
                                    </>
                                )}
                            </button>

                            {!isDev && (
                                <p className="mt-4 text-xs text-center text-gray-500">
                                    This site is protected by reCAPTCHA and the
                                    Google{" "}
                                    <a
                                        href="https://policies.google.com/privacy"
                                        className="text-secondary-600 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Privacy Policy
                                    </a>{" "}
                                    and{" "}
                                    <a
                                        href="https://policies.google.com/terms"
                                        className="text-secondary-600 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Terms of Service
                                    </a>{" "}
                                    apply.
                                </p>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
