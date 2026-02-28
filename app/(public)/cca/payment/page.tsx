"use client";

import { useState, ChangeEvent, useRef } from "react";
import Link from "next/link";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import {
  ALLOWED_UPLOAD_ACCEPT,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

export default function PaymentUpdatePage() {
  const [studentType, setStudentType] = useState<"local" | "international">(
    "local",
  );
  const [identifier, setIdentifier] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [studentDetails, setStudentDetails] = useState<{
    id: string;
    firstName: string;
    fullName: string;
    programName: string;
    fullAmount: number;
    paidAmount: number;
    balanceDue: number;
  } | null>(null);

  // File Upload State
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const { uploadFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Labels based on Student Type
  const identifierLabel =
    studentType === "local" ? "National ID (NIC) Number" : "Passport Number";
  const identifierPlaceholder =
    studentType === "local" ? "E.g., 981234567V" : "E.g., N1234567";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleFetchDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setFetchError(`Please enter your ${identifierLabel.toLowerCase()}`);
      return;
    }

    setIsFetching(true);
    setFetchError("");
    setStudentDetails(null);

    try {
      const response = await fetch(
        `/api/registrations/lookup?type=${studentType}&identifier=${encodeURIComponent(identifier)}`,
      );
      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setStudentDetails(result.data);
      } else {
        setFetchError(
          result.error ||
            "No registered student found with this detail. Please check and try again.",
        );
      }
    } catch (error) {
      console.error("Failed to fetch student details:", error);
      setFetchError(
        "An error occurred while fetching details. Please try again later.",
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        alert(
          `File "${file.name}" is too large! Maximum ${MAX_UPLOAD_SIZE_MB}MB.`,
        );
        e.target.value = "";
        setPaymentFile(null);
        return;
      }
      setPaymentFile(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentFile || !studentDetails) return;

    const currentRegistrationId = studentDetails.id;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setUploadProgress(10);

    try {
      // Simulated upload progress steps for UX
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      // Real upload call
      const fileUrl = await uploadFile(paymentFile, "receipts");

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress(95);

      // POST to backend API
      const submitData = new FormData();
      submitData.set("registration_id", currentRegistrationId);
      submitData.set("payment_url", fileUrl);

      const response = await fetch("/api/registrations/payment-update", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update payment record");
      }

      setUploadProgress(100);
      setSubmitStatus("success");
    } catch (error) {
      console.error("Payment submission failed:", error);
      setSubmitStatus("error");
      alert("Failed to submit payment slip. Please try again.");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen py-6 sm:py-12 px-3 sm:px-6 lg:px-8 overflow-hidden text-gray-800 antialiased">
      {/* Premium Glassmorphic Background matching /register */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 overflow-hidden -z-10">
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

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <Link href="/" className="inline-block mb-4 sm:mb-6 group">
            <img
              src="/images/logo-wide.png"
              alt="Codezela Career Accelerator"
              className="h-12 sm:h-16 md:h-20 mx-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2 sm:mb-3 px-2">
            Payment Update Portal
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 px-2 max-w-xl mx-auto">
            Securely upload your payment slips and track your tuition balance.
          </p>
        </div>

        {submitStatus === "success" ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-2xl rounded-3xl p-8 sm:p-12 text-center text-gray-800 transform transition-all duration-500 hover:shadow-primary-500/10">
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
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Payment Slip Submitted!
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Thank you. Our finance team will review your payment slip and
              update your verified balance shortly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold transition-transform hover:scale-105 shadow-lg shadow-primary-500/30"
            >
              Submit Another Slip
            </button>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Section 1: Student Identification */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shrink-0">
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
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Student Identity
                  </h2>
                  <p className="text-sm text-gray-600">
                    Enter your details to retrieve your fee structure
                  </p>
                </div>
              </div>

              <form onSubmit={handleFetchDetails} className="space-y-6">
                {/* Student Type Toggle */}
                <div className="flex bg-gray-100/80 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentType("local");
                      setIdentifier("");
                      setStudentDetails(null);
                    }}
                    className={`flex-1 py-2.5 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 ${
                      studentType === "local"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Local Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentType("international");
                      setIdentifier("");
                      setStudentDetails(null);
                    }}
                    className={`flex-1 py-2.5 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 ${
                      studentType === "international"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    International Student
                  </button>
                </div>

                {/* Dynamic Identifier Input */}
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {identifierLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setFetchError("");
                    }}
                    placeholder={identifierPlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none uppercase"
                    disabled={!!studentDetails}
                  />
                  {fetchError && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">
                      {fetchError}
                    </p>
                  )}
                </div>

                {!studentDetails && (
                  <button
                    type="submit"
                    disabled={isFetching || !identifier.trim()}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetching ? (
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
                        Locating Records...
                      </>
                    ) : (
                      <>
                        Fetch Details
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
                )}
              </form>
            </div>

            {/* Section 2: Payment Overview & Upload (Progressive Disclosure) */}
            {studentDetails && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl rounded-2xl p-6 sm:p-8 animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
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
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Hi, {studentDetails.firstName}{" "}
                      </h2>
                      <p className="text-sm text-gray-600 truncate max-w-[200px] sm:max-w-md">
                        Financial Overview for {studentDetails.fullName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStudentDetails(null)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Change Student
                  </button>
                </div>

                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Student Name</p>
                    <p
                      className="font-semibold text-gray-800 truncate"
                      title={studentDetails.fullName}
                    >
                      {studentDetails.fullName}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">
                      Enrolled Program
                    </p>
                    <p
                      className="font-semibold text-gray-800 truncate"
                      title={studentDetails.programName}
                    >
                      {studentDetails.programName}
                    </p>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white/80 rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Payable</p>
                    <p className="text-lg font-bold text-gray-800">
                      {formatCurrency(studentDetails.fullAmount)}
                    </p>
                  </div>
                  <div className="bg-green-50/80 rounded-xl p-4 border border-green-100 shadow-sm">
                    <p className="text-sm text-green-600 mb-1">Total Paid</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatCurrency(studentDetails.paidAmount)}
                    </p>
                  </div>
                  <div className="bg-primary-50/80 rounded-xl p-4 border border-primary-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary-100 rounded-full opacity-50"></div>
                    <p className="text-sm text-primary-600 mb-1 relative z-10">
                      Balance Due
                    </p>
                    <p className="text-lg font-bold text-primary-700 relative z-10">
                      {formatCurrency(studentDetails.balanceDue)}
                    </p>
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="border-t border-gray-100 pt-8 mt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Upload New Payment Slip
                  </h3>

                  <div
                    onClick={() =>
                      !isSubmitting && fileInputRef.current?.click()
                    }
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      paymentFile
                        ? "border-primary-400 bg-primary-50/50"
                        : "border-gray-200 bg-gray-50/50 hover:border-primary-300 hover:bg-gray-50"
                    } ${isSubmitting && "opacity-60 cursor-not-allowed"}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept={ALLOWED_UPLOAD_ACCEPT}
                      className="hidden"
                      disabled={isSubmitting}
                    />

                    {!paymentFile ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-gray-700">
                          Click to upload payment slip
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG or PDF (Max. {MAX_UPLOAD_SIZE_MB}MB)
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm mb-3">
                          <svg
                            className="w-6 h-6 text-green-600"
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
                        <p className="font-semibold text-gray-800">
                          {paymentFile.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {(paymentFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>

                        {!isSubmitting && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentFile(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="mt-3 text-sm text-red-500 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleSubmitPayment}
                    disabled={!paymentFile || isSubmitting}
                    className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold transition-all shadow-lg hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        Submitting... {uploadProgress}%
                      </div>
                    ) : (
                      "Submit Payment Update"
                    )}

                    {/* Progress Bar Background */}
                    {isSubmitting && (
                      <div
                        className="absolute inset-0 bg-black/20 origin-left transition-all duration-300 pointer-events-none"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
