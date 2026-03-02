"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  FileText,
  Loader2,
  Upload,
  Trash2,
  ExternalLink,
  Files,
  ShieldAlert,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  appendRegistrationDocuments,
  hardDeleteRegistrationDocument,
  updateRegistrationProfile,
} from "@/app/(admin)/admin/(dashboard)/dashboard-actions";
import { useToast } from "@/hooks/use-toast";
import { toDateInputValue } from "@/lib/formatters";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_LABEL,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";
import {
  canonicalizeDocumentUrl,
  getNicDocumentCurrentIds,
  getNicDocumentSideLabel,
  normalizeDocumentCollection,
  type NicDocumentSide,
  type RegistrationDocumentCategory,
  type RegistrationDocumentEntry,
} from "@/lib/registration-documents";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  nameWithInitials: z.string().min(2, "Name with initials is required"),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string(),
  nicNumber: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  nationality: z.string(),
  countryOfBirth: z.string(),
  emailAddress: z.string().email("Invalid email"),
  whatsappNumber: z.string().min(5, "WhatsApp number is required"),
  homeContactNumber: z.string().optional().nullable(),
  permanentAddress: z.string().min(5, "Address is required"),
  district: z.string().optional().nullable(),
  postalCode: z.string(),
  country: z.string(),
  guardianContactName: z.string().min(2, "Guardian name is required"),
  guardianContactNumber: z.string().min(5, "Guardian contact is required"),
  highestQualification: z.enum([
    "degree",
    "diploma",
    "postgraduate",
    "msc",
    "phd",
    "work_experience",
    "other",
  ]),
  qualificationStatus: z.enum(["completed", "ongoing"]),
  qualificationCompletedDate: z.string().optional().nullable(),
  qualificationExpectedCompletionDate: z.string().optional().nullable(),
  programId: z.string().min(1, "Program selection is required"),
  programName: z.string().min(1),
  programYear: z.string().min(1),
  programDuration: z.string().min(1),
  fullAmount: z.string().optional().nullable(),
  currentPaidAmount: z.string().optional().nullable(),
});

type RegistrationFormValues = z.infer<typeof formSchema>;
type UploadDirectory = "documents" | "receipts" | "avatars";

type UploadResponsePayload = {
  publicUrl: string;
  key: string;
  filename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
};

type DocumentCategoryConfig = {
  key: RegistrationDocumentCategory;
  label: string;
  description: string;
  directory: UploadDirectory;
};

const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  {
    key: "academicQualificationDocuments",
    label: "Academic Documents",
    description: "Certificates, transcripts, and qualification proofs.",
    directory: "documents",
  },
  {
    key: "nicDocuments",
    label: "NIC Documents",
    description:
      "National ID copies with explicit Front/Back history tracking.",
    directory: "documents",
  },
  {
    key: "passportDocuments",
    label: "Passport Documents",
    description: "Passport scans and supporting identity files.",
    directory: "documents",
  },
  {
    key: "passportPhoto",
    label: "Passport Photo",
    description: "Student portrait / passport-style image.",
    directory: "avatars",
  },
  {
    key: "paymentSlip",
    label: "Payment Slips",
    description: "Submitted payment confirmations and receipts.",
    directory: "receipts",
  },
];

function getUploadTaskKey(
  category: RegistrationDocumentCategory,
  side?: NicDocumentSide,
): string {
  if (category === "nicDocuments" && side) {
    return `${category}:${side}`;
  }
  return category;
}

interface EditRegistrationClientProps {
  registration: {
    id: number;
    registerId: string;
    fullName: string;
    nameWithInitials: string;
    gender: "male" | "female";
    dateOfBirth: string;
    nicNumber?: string | null;
    passportNumber?: string | null;
    nationality: string;
    countryOfBirth: string;
    emailAddress: string;
    whatsappNumber: string;
    homeContactNumber?: string | null;
    permanentAddress: string;
    district?: string | null;
    postalCode: string;
    country: string;
    guardianContactName: string;
    guardianContactNumber: string;
    highestQualification:
      | "degree"
      | "diploma"
      | "postgraduate"
      | "msc"
      | "phd"
      | "work_experience"
      | "other";
    qualificationStatus: "completed" | "ongoing";
    qualificationCompletedDate?: string | null;
    qualificationExpectedCompletionDate?: string | null;
    programId: string;
    programName: string;
    programYear: string;
    programDuration: string;
    fullAmount?: string | number | null;
    currentPaidAmount?: string | number | null;
    academicQualificationDocuments?: unknown;
    nicDocuments?: unknown;
    passportDocuments?: unknown;
    passportPhoto?: unknown;
    paymentSlip?: unknown;
  };
  programs: { programId: string; programName: string }[];
}

function buildInitialDocumentState(registration: EditRegistrationClientProps["registration"]) {
  return {
    academicQualificationDocuments: normalizeDocumentCollection(
      registration.academicQualificationDocuments,
    ),
    nicDocuments: normalizeDocumentCollection(registration.nicDocuments),
    passportDocuments: normalizeDocumentCollection(registration.passportDocuments),
    passportPhoto: normalizeDocumentCollection(registration.passportPhoto),
    paymentSlip: normalizeDocumentCollection(registration.paymentSlip),
  } satisfies Record<RegistrationDocumentCategory, RegistrationDocumentEntry[]>;
}

function formatUploadDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString();
}

function getReadableFileName(doc: RegistrationDocumentEntry): string {
  if (typeof doc.filename === "string" && doc.filename.trim().length) {
    return doc.filename;
  }

  try {
    const url = new URL(doc.url);
    const pathPart = decodeURIComponent(url.pathname.split("/").pop() || "");
    return pathPart || "document";
  } catch {
    return "document";
  }
}

export default function EditRegistrationClient({
  registration,
  programs,
}: EditRegistrationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const [documentsByCategory, setDocumentsByCategory] = useState(
    buildInitialDocumentState(registration),
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    category: RegistrationDocumentCategory;
    document: RegistrationDocumentEntry;
  } | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: registration.fullName,
      nameWithInitials: registration.nameWithInitials,
      gender: registration.gender,
      dateOfBirth: toDateInputValue(registration.dateOfBirth),
      nicNumber: registration.nicNumber ?? null,
      passportNumber: registration.passportNumber ?? null,
      nationality: registration.nationality,
      countryOfBirth: registration.countryOfBirth,
      emailAddress: registration.emailAddress,
      whatsappNumber: registration.whatsappNumber,
      homeContactNumber: registration.homeContactNumber ?? null,
      permanentAddress: registration.permanentAddress,
      district: registration.district ?? null,
      postalCode: registration.postalCode,
      country: registration.country,
      guardianContactName: registration.guardianContactName,
      guardianContactNumber: registration.guardianContactNumber,
      highestQualification: registration.highestQualification,
      qualificationStatus: registration.qualificationStatus,
      qualificationCompletedDate: registration.qualificationCompletedDate
        ? toDateInputValue(registration.qualificationCompletedDate)
        : null,
      qualificationExpectedCompletionDate: registration.qualificationExpectedCompletionDate
        ? toDateInputValue(registration.qualificationExpectedCompletionDate)
        : null,
      programId: registration.programId,
      programName: registration.programName,
      programYear: registration.programYear,
      programDuration: registration.programDuration,
      fullAmount:
        registration.fullAmount === null || registration.fullAmount === undefined
          ? null
          : String(registration.fullAmount),
      currentPaidAmount:
        registration.currentPaidAmount === null ||
        registration.currentPaidAmount === undefined
          ? null
          : String(registration.currentPaidAmount),
    },
  });

  const programOptions = useMemo(
    () =>
      programs.map((program) => ({
        ...program,
        value: program.programId,
      })),
    [programs],
  );

  async function uploadDocumentFile(
    file: File,
    directory: UploadDirectory,
  ): Promise<UploadResponsePayload> {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`"${file.name}" exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`);
    }

    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new Error(`"${file.name}" has unsupported type. Allowed: ${ALLOWED_UPLOAD_LABEL}.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("directory", directory);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || !result?.data) {
      throw new Error(
        typeof result?.error === "string"
          ? result.error
          : `Failed to upload "${file.name}".`,
      );
    }

    return result.data as UploadResponsePayload;
  }

  async function onSubmit(values: RegistrationFormValues) {
    setIsSaving(true);
    try {
      const result = await updateRegistrationProfile(registration.id, values);
      if (!result.success) {
        throw new Error(result.error || "Failed to update registration.");
      }

      toast({
        title: "Success",
        description: "Registration updated successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update registration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDocumentUpload(
    category: RegistrationDocumentCategory,
    directory: UploadDirectory,
    fileList: FileList | null,
    options?: { side?: NicDocumentSide },
  ) {
    if (!fileList?.length) return;

    const files = Array.from(fileList);
    const uploadTaskKey = getUploadTaskKey(category, options?.side);
    setUploadingTask(uploadTaskKey);
    try {
      const uploaded = await Promise.all(
        files.map((file) => uploadDocumentFile(file, directory)),
      );

      const appendResult = await appendRegistrationDocuments(
        registration.id,
        category,
        uploaded.map((item) => ({
          url: item.publicUrl,
          key: item.key,
          filename: item.filename,
          contentType: item.contentType,
          fileSize: item.fileSize,
          uploadedAt: item.uploadedAt,
          source: "admin_upload",
          side: category === "nicDocuments" ? options?.side : undefined,
        })),
      );

      if (!appendResult.success) {
        throw new Error(
          appendResult.error || "Failed to attach uploaded documents.",
        );
      }

      setDocumentsByCategory((prev) => ({
        ...prev,
        [category]: normalizeDocumentCollection(appendResult.documents),
      }));
      toast({
        title: "Files Added",
        description: `${files.length} file(s) added to document history.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Document upload failed.",
        variant: "destructive",
      });
    } finally {
      setUploadingTask(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeletePending(true);
    try {
      const result = await hardDeleteRegistrationDocument(
        registration.id,
        deleteTarget.category,
        deleteTarget.document.id,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to delete document.");
      }

      setDocumentsByCategory((prev) => ({
        ...prev,
        [deleteTarget.category]: normalizeDocumentCollection(result.documents),
      }));
      setDeleteTarget(null);

      if (result.warning) {
        toast({
          title: "Deleted with Warning",
          description: result.warning,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Document Deleted",
          description: "Document was removed successfully.",
        });
      }

      router.refresh();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete document.",
        variant: "destructive",
      });
    } finally {
      setIsDeletePending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Registration</h1>
          <p className="text-muted-foreground">
            {registration.fullName} • {registration.registerId}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:flex lg:gap-1 bg-white/50 backdrop-blur-sm border p-1 rounded-xl">
          <TabsTrigger
            value="personal"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <User className="w-4 h-4 mr-2 hidden sm:inline" />
            Personal
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Mail className="w-4 h-4 mr-2 hidden sm:inline" />
            Contact
          </TabsTrigger>
          <TabsTrigger
            value="academic"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <GraduationCap className="w-4 h-4 mr-2 hidden sm:inline" />
            Academic
          </TabsTrigger>
          <TabsTrigger
            value="program"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
            Program
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Files className="w-4 h-4 mr-2 hidden sm:inline" />
            Documents
          </TabsTrigger>
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <TabsContent value="personal" className="space-y-4">
            <Card className="border-none shadow-xl shadow-gray-200/50">
              <CardHeader>
                <CardTitle className="text-lg">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" {...form.register("fullName")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nameWithInitials">Name with Initials</Label>
                  <Input
                    id="nameWithInitials"
                    {...form.register("nameWithInitials")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    defaultValue={form.getValues("gender")}
                    onValueChange={(value) =>
                      form.setValue("gender", value as "male" | "female")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    type="date"
                    id="dateOfBirth"
                    {...form.register("dateOfBirth")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nicNumber">NIC Number</Label>
                  <Input id="nicNumber" {...form.register("nicNumber")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    {...form.register("passportNumber")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card className="border-none shadow-xl shadow-gray-200/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  Contact & Guardian Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email Address</Label>
                  <Input id="emailAddress" {...form.register("emailAddress")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    {...form.register("whatsappNumber")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="permanentAddress">Permanent Address</Label>
                  <Textarea
                    id="permanentAddress"
                    {...form.register("permanentAddress")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" {...form.register("district")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianContactName">Guardian Name</Label>
                  <Input
                    id="guardianContactName"
                    {...form.register("guardianContactName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianContactNumber">Guardian Contact</Label>
                  <Input
                    id="guardianContactNumber"
                    {...form.register("guardianContactNumber")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4">
            <Card className="border-none shadow-xl shadow-gray-200/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  Academic Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="highestQualification">
                    Highest Qualification
                  </Label>
                  <Select
                    defaultValue={form.getValues("highestQualification")}
                    onValueChange={(value) =>
                      form.setValue(
                        "highestQualification",
                        value as RegistrationFormValues["highestQualification"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="degree">Degree</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="msc">MSc</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                      <SelectItem value="work_experience">
                        Work Experience
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualificationStatus">Status</Label>
                  <Select
                    defaultValue={form.getValues("qualificationStatus")}
                    onValueChange={(value) =>
                      form.setValue(
                        "qualificationStatus",
                        value as "completed" | "ongoing",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualificationCompletedDate">
                    Completion Date (Optional)
                  </Label>
                  <Input
                    type="date"
                    id="qualificationCompletedDate"
                    {...form.register("qualificationCompletedDate")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualificationExpectedCompletionDate">
                    Expected Completion Date (Optional)
                  </Label>
                  <Input
                    type="date"
                    id="qualificationExpectedCompletionDate"
                    {...form.register("qualificationExpectedCompletionDate")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-4">
            <Card className="border-none shadow-xl shadow-gray-200/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  Program & Financial Overrides
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="programId">Selected Program</Label>
                  <Select
                    defaultValue={form.getValues("programId")}
                    onValueChange={(value) => {
                      form.setValue("programId", value);
                      const selectedProgram = programOptions.find(
                        (program) => program.programId === value,
                      );
                      if (selectedProgram) {
                        form.setValue("programName", selectedProgram.programName);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programOptions.map((program) => (
                        <SelectItem key={program.programId} value={program.value}>
                          {program.programId} • {program.programName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="programName">Program Name</Label>
                  <Input id="programName" readOnly {...form.register("programName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullAmount">Total Fee Override (LKR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="fullAmount"
                    {...form.register("fullAmount")}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Original: LKR {registration.fullAmount || "0.00"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPaidAmount">
                    Total Paid Manual Sync (LKR)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="currentPaidAmount"
                    readOnly
                    aria-readonly="true"
                    className="bg-muted/60 text-muted-foreground cursor-not-allowed"
                    {...form.register("currentPaidAmount")}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Legacy field (read-only).
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Original: LKR {registration.currentPaidAmount || "0.00"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programYear">Program Year</Label>
                  <Input id="programYear" {...form.register("programYear")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programDuration">Duration</Label>
                  <Input
                    id="programDuration"
                    {...form.register("programDuration")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="border-none shadow-xl shadow-gray-200/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Files className="w-5 h-5 text-primary" />
                  Document Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {DOCUMENT_CATEGORIES.map((category) => {
                  const documents = documentsByCategory[category.key];
                  const nicCurrentIds =
                    category.key === "nicDocuments"
                      ? getNicDocumentCurrentIds(documents)
                      : null;
                  const isCategoryUploading =
                    uploadingTask !== null &&
                    uploadingTask.startsWith(`${category.key}`);

                  return (
                    <div
                      key={category.key}
                      className="rounded-2xl border border-gray-200 bg-white/60 p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">
                            {category.label}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                            {documents.length} file(s)
                          </span>
                          {category.key === "nicDocuments" ? (
                            <div className="flex items-center gap-2">
                              {(["front", "back"] as const).map((side) => {
                                const sideTask = getUploadTaskKey(
                                  category.key,
                                  side,
                                );
                                const sideLabel =
                                  side === "front" ? "Upload Front" : "Upload Back";

                                return (
                                  <div key={side}>
                                    <Label
                                      htmlFor={`upload-${category.key}-${side}`}
                                      className="inline-flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-primary/5"
                                    >
                                      {uploadingTask === sideTask ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Upload className="w-3 h-3" />
                                      )}
                                      {sideLabel}
                                    </Label>
                                    <Input
                                      id={`upload-${category.key}-${side}`}
                                      type="file"
                                      accept={ALLOWED_UPLOAD_ACCEPT}
                                      className="hidden"
                                      onChange={(event) => {
                                        void handleDocumentUpload(
                                          category.key,
                                          category.directory,
                                          event.target.files,
                                          { side },
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                      disabled={isCategoryUploading}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              <Label
                                htmlFor={`upload-${category.key}`}
                                className="inline-flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-primary/5"
                              >
                                {isCategoryUploading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Upload className="w-3 h-3" />
                                )}
                                Add files
                              </Label>
                              <Input
                                id={`upload-${category.key}`}
                                type="file"
                                multiple
                                accept={ALLOWED_UPLOAD_ACCEPT}
                                className="hidden"
                                onChange={(event) => {
                                  void handleDocumentUpload(
                                    category.key,
                                    category.directory,
                                    event.target.files,
                                  );
                                  event.currentTarget.value = "";
                                }}
                                disabled={isCategoryUploading}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {documents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 py-5 text-center text-xs text-muted-foreground">
                          No documents uploaded for this category.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((document, index) => {
                            const safeUrl = canonicalizeDocumentUrl(document.url);
                            const isCurrent =
                              category.key === "nicDocuments"
                                ? Boolean(nicCurrentIds?.has(document.id))
                                : index === 0;
                            const nicSideLabel =
                              category.key === "nicDocuments"
                                ? getNicDocumentSideLabel(document.side)
                                : null;
                            return (
                              <div
                                key={document.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {getReadableFileName(document)}
                                    </p>
                                    {isCurrent && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                        Current
                                      </span>
                                    )}
                                    {nicSideLabel && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">
                                        {nicSideLabel}
                                      </span>
                                    )}
                                    {!safeUrl && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3" />
                                        Blocked URL
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    Uploaded: {formatUploadDate(document.uploadedAt)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {document.url}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {safeUrl ? (
                                    <Button variant="outline" size="sm" asChild>
                                      <a
                                        href={safeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Open
                                      </a>
                                    </Button>
                                  ) : (
                                    <Button variant="outline" size="sm" disabled>
                                      Blocked
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      setDeleteTarget({
                                        category: category.key,
                                        document,
                                      })
                                    }
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Allowed file formats: {ALLOWED_UPLOAD_LABEL}. Maximum size per file:{" "}
              {MAX_UPLOAD_SIZE_MB}MB.
            </p>
          </TabsContent>
        </motion.div>
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t pb-20">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 px-8"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Document?"
        description={
          deleteTarget
            ? `This will permanently remove "${getReadableFileName(deleteTarget.document)}" from history.`
            : undefined
        }
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        variant="destructive"
        isPending={isDeletePending}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}
