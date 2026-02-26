"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  History,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addPayment } from "@/app/(admin)/admin/(dashboard)/finance/finance-actions";
import { useToast } from "@/hooks/use-toast";

interface RegistrationDetailsClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
}

export default function RegistrationDetailsClient({
  registration,
}: RegistrationDetailsClientProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Close document viewer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDoc(null);
    };
    if (selectedDoc) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoc]);

  const fullAmount = parseFloat(registration.fullAmount || "0");
  const payments = registration.payments || [];

  // Calculate total paid from actual transaction records
  const calculatedPaidAmount = payments.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: number, p: any) =>
      p.status === "PAID" ? acc + parseFloat(p.amount) : acc,
    0,
  );

  // Use manual sync amount if it exists, otherwise fallback to calculated amount
  const paidAmount =
    registration.currentPaidAmount !== null && registration.currentPaidAmount !== undefined
      ? parseFloat(registration.currentPaidAmount)
      : calculatedPaidAmount;

  const balance = fullAmount - paidAmount;
  const isFullyPaid = balance <= 0 && fullAmount > 0;

  const documents = [
    ...(Array.isArray(registration.passportPhoto)
      ? registration.passportPhoto.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc: any, i: number) => ({
          url: typeof doc === "string" ? doc : doc.url,
          title: `Passport Photo ${i + 1}`,
          type: "image",
          category: "Personal",
        }),
      )
      : registration.passportPhoto
        ? [
          {
            url:
              typeof registration.passportPhoto === "string"
                ? registration.passportPhoto
                : (registration.passportPhoto as { url?: string })?.url,
            title: "Passport Photo",
            type: "image",
            category: "Personal",
          },
        ]
        : []),
    ...(Array.isArray(registration.passportDocuments)
      ? registration.passportDocuments.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc: any, i: number) => ({
          url: typeof doc === "string" ? doc : doc.url,
          title: `Passport Document ${i + 1}`,
          type: "auto",
          category: "Identity",
        }),
      )
      : registration.passportDocuments
        ? [
          {
            url:
              typeof registration.passportDocuments === "string"
                ? registration.passportDocuments
                : (registration.passportDocuments as { url?: string })?.url,
            title: "Passport Document",
            type: "auto",
            category: "Identity",
          },
        ]
        : []),
    ...(Array.isArray(registration.paymentSlip)
      ? registration.paymentSlip.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc: any, i: number) => ({
          url: typeof doc === "string" ? doc : doc.url,
          title: `Payment Slip ${i + 1}`,
          type: "auto",
          category: "Payment",
        }),
      )
      : registration.paymentSlip
        ? [
          {
            url:
              typeof registration.paymentSlip === "string"
                ? registration.paymentSlip
                : (registration.paymentSlip as { url?: string })?.url,
            title: "Payment Slip",
            type: "auto",
            category: "Payment",
          },
        ]
        : []),
    ...(Array.isArray(registration.academicQualificationDocuments)
      ? registration.academicQualificationDocuments.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc: any, i: number) => ({
          url: typeof doc === "string" ? doc : doc.url,
          title: `Academic Document ${i + 1}`,
          type: "auto",
          category: "Academic",
        }),
      )
      : registration.academicQualificationDocuments
        ? [
          {
            url:
              typeof registration.academicQualificationDocuments === "string"
                ? registration.academicQualificationDocuments
                : (registration.academicQualificationDocuments as { url?: string })?.url,
            title: "Academic Document",
            type: "auto",
            category: "Academic",
          },
        ]
        : []),
    ...(Array.isArray(registration.nicDocuments)
      ? registration.nicDocuments.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc: any, i: number) => ({
          url: typeof doc === "string" ? doc : doc.url,
          title: `NIC/Passport ${i + 1}`,
          type: "auto",
          category: "Identity",
        }),
      )
      : registration.nicDocuments
        ? [
          {
            url:
              typeof registration.nicDocuments === "string"
                ? registration.nicDocuments
                : (registration.nicDocuments as { url?: string })?.url,
            title: "NIC/Passport",
            type: "auto",
            category: "Identity",
          },
        ]
        : []),
  ];

  const getFileType = (url: string) => {
    if (!url || typeof url !== "string") return "other";
    const ext = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || ""))
      return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenDoc = (doc: any) => {
    const type = getFileType(doc.url);
    setSelectedDoc({ ...doc, detectedType: type });
    setZoom(1);
  };

  async function handlePaymentSubmit(formData: FormData) {
    setIsSavingPayment(true);
    try {
      await addPayment({
        registrationId: registration.id,
        amount: formData.get("amount"),
        paymentMethod: formData.get("method"),
        status: formData.get("status"),
        reference: formData.get("ref"),
        paidAt: new Date().toISOString(),
        remark: formData.get("remark"),
      });
      toast({
        title: "Payment Recorded",
        description: "The transaction has been successfully added.",
      });
      setIsPaymentModalOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPayment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-2 -ml-2 text-muted-foreground hover:text-primary"
          >
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              {registration.fullName}
            </h1>
            {registration.deletedAt && (
              <Badge variant="destructive" className="animate-pulse">
                Trashed
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Registration ID:{" "}
            <span className="font-mono font-medium">
              {registration.registerId ||
                `CCA-A${String(registration.id).padStart(5, "0")}`}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/registrations/${registration.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit details
            </Link>
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-700 hover:to-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white/80 backdrop-blur-sm shadow-xl shadow-indigo-100/20">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Payment Information
                </CardTitle>
                <Dialog
                  open={isPaymentModalOpen}
                  onOpenChange={setIsPaymentModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl bg-white/90 backdrop-blur-xl border-white/60 shadow-2xl">
                    <form action={handlePaymentSubmit}>
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                          <Wallet className="w-6 h-6 text-emerald-600" />
                          Add Payment
                        </DialogTitle>
                        <DialogDescription>
                          Process a new payment for {registration.fullName}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-6">
                        <div className="grid gap-2">
                          <Label htmlFor="amount">Payment Amount (LKR)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                              Rs.
                            </span>
                            <Input
                              id="amount"
                              name="amount"
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              className="pl-12 rounded-xl"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="method">Payment Method</Label>
                          <Select name="method" defaultValue="BANK_TRANSFER">
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BANK_TRANSFER">
                                Bank Transfer
                              </SelectItem>
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="ONLINE">
                                Online Payment
                              </SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Select name="status" defaultValue="PAID">
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PAID">Valid (Paid)</SelectItem>
                              <SelectItem value="VOID">Void (Cancelled)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="ref">Reference Number</Label>
                          <Input
                            id="ref"
                            name="ref"
                            placeholder="Ref/Receipt #"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="remark">Internal Remark</Label>
                          <Input
                            id="remark"
                            name="remark"
                            placeholder="Optional notes..."
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-700 font-medium">
                            Pending Balance:
                          </span>
                          <span className="font-bold text-emerald-900">
                            Rs. {balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsPaymentModalOpen(false)}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSavingPayment}
                          className="bg-emerald-600 hover:bg-emerald-700 px-8 rounded-xl shadow-lg"
                        >
                          {isSavingPayment ? "Recording..." : "Verify & Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.isArray(registration.tags) &&
                    registration.tags.length > 0 ? (
                    registration.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        className="bg-indigo-600/10 text-indigo-700 border-indigo-200"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No tags assigned
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-white/50 border-emerald-100 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      Course Fee
                    </p>
                    <p className="text-xl font-black text-emerald-600 mt-1">
                      LKR{" "}
                      {fullAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </Card>
                  <Card className="bg-white/50 border-indigo-100 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      Total Paid
                    </p>
                    <p className="text-xl font-black text-indigo-600 mt-1">
                      LKR{" "}
                      {paidAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </Card>
                  <Card
                    className={`bg-white/50 p-4 shadow-sm border-${balance > 0 ? "orange" : "emerald"}-100`}
                  >
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      Balance Due
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-xl font-black text-${balance > 0 ? "orange" : "emerald"}-600`}
                      >
                        LKR{" "}
                        {Math.abs(balance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {isFullyPaid && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </Card>
                </div>

                <div className="mt-8 pt-4 border-t border-indigo-100/50">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">
                      Transaction History
                    </h4>
                  </div>
                  <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/30 backdrop-blur-sm">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-gray-100">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-2">
                            Date
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-2">
                            Method
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-2">
                            Reference
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-2 text-right">
                            Amount
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-2 text-center">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground italic text-xs"
                            >
                              No transactions recorded yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          payments.map(
                            (p: {
                              id: string | number;
                              paymentDate: string;
                              paymentMethod: string;
                              receiptReference?: string;
                              amount: string | number;
                              status: string;
                            }) => (
                              <TableRow
                                key={p.id}
                                className="border-gray-100 group"
                              >
                                <TableCell className="text-xs font-medium py-3">
                                  {p.paymentDate &&
                                    !isNaN(new Date(p.paymentDate).getTime())
                                    ? format(new Date(p.paymentDate), "MMM d, yyyy")
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-[10px] font-black text-gray-500 py-3 uppercase">
                                  {p.paymentMethod}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 py-3 font-mono">
                                  {p.receiptReference || "-"}
                                </TableCell>
                                <TableCell className="text-sm font-black text-gray-900 py-3 text-right">
                                  Rs.{" "}
                                  {parseFloat(
                                    String(p.amount),
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  {p.status === "active" ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] px-1.5 py-0">
                                      PAID
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-rose-600 border-rose-200 text-[9px] px-1.5 py-0"
                                    >
                                      VOID
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ),
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Info */}
          <SectionCard
            title="Personal Information"
            icon={<User className="w-5 h-5 text-primary" />}
          >
            <DataGrid
              items={[
                {
                  label: "Full Name",
                  value: registration.fullName,
                  fullWidth: true,
                },
                {
                  label: "Name with Initials",
                  value: registration.nameWithInitials,
                  fullWidth: true,
                },
                {
                  label: "Gender",
                  value: registration.gender,
                  className: "capitalize",
                },
                {
                  label: "Date of Birth",
                  value: format(new Date(registration.dateOfBirth), "PPP"),
                },
                {
                  label: "NIC / Passport",
                  value:
                    registration.nicNumber ||
                    registration.passportNumber ||
                    "N/A",
                },
                {
                  label: "Nationality",
                  value: registration.nationality,
                },
                {
                  label: "Country of Birth",
                  value: registration.countryOfBirth,
                },
              ]}
            />
          </SectionCard>

          {/* Contact Info */}
          <SectionCard
            title="Contact Information"
            icon={<Mail className="w-5 h-5 text-primary" />}
          >
            <DataGrid
              items={[
                {
                  label: "Email Address",
                  value: registration.emailAddress,
                  fullWidth: true,
                  icon: <Mail className="w-3 h-3" />,
                },
                {
                  label: "WhatsApp Number",
                  value: registration.whatsappNumber,
                  icon: <Phone className="w-3 h-3" />,
                },
                {
                  label: "Home Contact",
                  value: registration.homeContactNumber || "N/A",
                },
                {
                  label: "Address",
                  value: registration.permanentAddress,
                  fullWidth: true,
                  icon: <MapPin className="w-3 h-3" />,
                },
                {
                  label: "District",
                  value: registration.district || "N/A",
                },
                {
                  label: "Postal Code",
                  value: registration.postalCode,
                },
                {
                  label: "Country",
                  value: registration.country,
                },
              ]}
            />
          </SectionCard>

          {/* Qualification & Program */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard
              title="Academic"
              icon={<GraduationCap className="w-5 h-5 text-primary" />}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Highest Qualification
                  </p>
                  <p className="font-semibold text-gray-900 mt-1 capitalize">
                    {registration.highestQualification.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <p className="font-semibold text-gray-900 mt-1 capitalize">
                    {registration.qualificationStatus}
                  </p>
                </div>
                {registration.qualificationCompletedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Completed Date
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">
                      {format(
                        new Date(registration.qualificationCompletedDate),
                        "MMMM yyyy",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
            <SectionCard
              title="Program"
              icon={<FileText className="w-5 h-5 text-primary" />}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Selected Course
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {registration.programName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {registration.program?.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Duration
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {registration.programDuration}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Year
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {registration.programYear}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Guardian Info */}
          <SectionCard
            title="Guardian Information"
            icon={<User className="w-5 h-5 text-primary" />}
          >
            <DataGrid
              items={[
                {
                  label: "Guardian Name",
                  value: registration.guardianContactName,
                },
                {
                  label: "Guardian Contact",
                  value: registration.guardianContactNumber,
                },
              ]}
            />
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Log Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Registration Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Joined At</span>
                <span className="font-medium">
                  {format(new Date(registration.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">
                  {format(new Date(registration.updatedAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">System ID</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {registration.id}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Documents</CardTitle>
              <Badge
                variant="secondary"
                className="bg-primary/5 text-primary border-primary/10"
              >
                {documents.length} Files
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.map((doc, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenDoc(doc)}
                  className="w-full group flex items-center justify-between p-3 rounded-xl border border-transparent bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                      {getFileType(doc.url) === "image" ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                        {doc.category}
                      </p>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {doc.title}
                      </p>
                    </div>
                  </div>
                  <Maximize2 className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground italic">
                    No documents uploaded
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setSelectedDoc(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl h-full flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 px-6 border-b bg-white z-10">
                <div>
                  <Badge variant="outline" className="mb-1">
                    {selectedDoc.category}
                  </Badge>
                  <h3 className="text-lg font-bold">{selectedDoc.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDoc.detectedType === "image" && (
                    <div className="flex items-center gap-1 mr-4 bg-gray-100 rounded-full p-1 px-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-[10px] font-mono min-w-[40px] text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-4 mx-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setZoom(1)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Open Original
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDoc(null)}
                    className="rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 relative overflow-hidden bg-gray-50 flex items-center justify-center p-4">
                {selectedDoc.detectedType === "image" ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center cursor-grab active:cursor-grabbing">
                    <motion.img
                      src={selectedDoc.url}
                      alt={selectedDoc.title}
                      style={{ scale: zoom }}
                      className="max-w-full max-h-full rounded-lg shadow-xl"
                    />
                  </div>
                ) : selectedDoc.detectedType === "pdf" ? (
                  <iframe
                    src={`${selectedDoc.url}#toolbar=0`}
                    className="w-full h-full border-0 rounded-lg"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="text-center p-12">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h4 className="text-xl font-bold text-gray-400">
                      Preview Not Available
                    </h4>
                    <p className="text-muted-foreground mt-2 mb-6">
                      This file type cannot be previewed. Please open the
                      original file.
                    </p>
                    <Button asChild>
                      <a
                        href={selectedDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download File
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground bg-gray-50/50">
                <span>
                  Press{" "}
                  <kbd className="font-sans px-1.5 py-0.5 bg-white border rounded">
                    ESC
                  </kbd>{" "}
                  to close
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                    Secure Storage
                  </span>
                  <span className="hidden sm:inline">
                    URL:{" "}
                    {selectedDoc.url
                      ? selectedDoc.url.split("?")[0].slice(0, 50) + "..."
                      : "N/A"}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-primary/5 shadow-md shadow-primary/5">
      <CardHeader className="pb-3 border-b border-gray-50">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}

function DataGrid({
  items,
}: {
  items: {
    label: string;
    value: string | React.ReactNode;
    fullWidth?: boolean;
    className?: string;
    icon?: React.ReactNode;
  }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
      {items.map((item, i) => (
        <div key={i} className={item.fullWidth ? "sm:col-span-2" : ""}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            {item.label}
          </p>
          <div className="flex items-start gap-2">
            {item.icon && (
              <div className="mt-1 text-primary/40">{item.icon}</div>
            )}
            <p
              className={`text-base font-semibold text-gray-900 leading-relaxed ${item.className || ""}`}
            >
              {item.value || (
                <span className="text-muted-foreground/30 italic font-normal">
                  Not Provided
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
