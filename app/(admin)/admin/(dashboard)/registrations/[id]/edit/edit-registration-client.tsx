"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  FileText,
  Check,
  Loader2,
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
import { updateRegistration } from "@/app/(admin)/admin/(dashboard)/dashboard-actions";
import { useToast } from "@/hooks/use-toast";
import { toDateInputValue } from "@/lib/formatters";

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
  programName: z.string(),
  programYear: z.string(),
  programDuration: z.string(),
  fullAmount: z.string().optional().nullable(),
  currentPaidAmount: z.string().optional().nullable(),
});

interface EditRegistrationClientProps {
  registration: any;
  programs: { programId: string; programName: string }[];
}

export default function EditRegistrationClient({
  registration,
  programs,
}: EditRegistrationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: registration.fullName,
      nameWithInitials: registration.nameWithInitials,
      gender: registration.gender,
      dateOfBirth: toDateInputValue(registration.dateOfBirth),
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
      qualificationCompletedDate: registration.qualificationCompletedDate
        ? toDateInputValue(registration.qualificationCompletedDate)
        : null,
      programName: registration.programName,
      programYear: registration.programYear,
      programDuration: registration.programDuration,
      fullAmount: registration.fullAmount,
      currentPaidAmount: registration.currentPaidAmount,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const result = await updateRegistration(registration.id, values);
      if (result.success) {
        toast({
          title: "Success",
          description: "Registration updated successfully",
          variant: "default",
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update registration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Registration
          </h1>
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
        <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:flex lg:gap-1 bg-white/50 backdrop-blur-sm border p-1 rounded-xl">
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
                    onValueChange={(v) => form.setValue("gender", v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                  <Label htmlFor="guardianContactNumber">
                    Guardian Contact
                  </Label>
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
                    onValueChange={(v) =>
                      form.setValue(
                        "highestQualification",
                        v as
                        | "other"
                        | "degree"
                        | "diploma"
                        | "postgraduate"
                        | "msc"
                        | "phd"
                        | "work_experience",
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
                    onValueChange={(v) =>
                      form.setValue(
                        "qualificationStatus",
                        v as "completed" | "ongoing",
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
                  <Label htmlFor="programName">Selected Program</Label>
                  <Select
                    defaultValue={form.getValues("programName")}
                    onValueChange={(v) => form.setValue("programName", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.programId} value={p.programName}>
                          {p.programName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
    </div>
  );
}
