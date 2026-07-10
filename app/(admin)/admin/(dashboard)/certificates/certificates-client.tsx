"use client";

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  Award,
  CalendarDays,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminBusyRouter } from "@/components/admin/admin-activity-provider";
import { useToast } from "@/hooks/use-toast";
import { formatAppDate, toDateInputValue } from "@/lib/formatters";
import {
  getPaginationDisplay,
  getPaginationRange,
} from "@/lib/pagination";
import {
  createCertificate,
  deleteCertificate,
  searchCertificateStudents,
  updateCertificate,
  type CertificateListItem,
  type CertificateProgramOption,
  type CertificateStudentOption,
} from "./certificates-actions";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; certificate: CertificateListItem }
  | null;

const ALL_VALUE = "__all__";

function getTodayInAppTimeZone() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

export default function CertificatesClient({
  initialCertificates,
  programs,
  currentSearch,
  currentProgram,
  currentResult,
  currentPage,
  pageSize,
  totalPages,
  totalRows,
}: {
  initialCertificates: CertificateListItem[];
  programs: CertificateProgramOption[];
  currentSearch: string;
  currentProgram: string;
  currentResult: string;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}) {
  const router = useAdminBusyRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<CertificateListItem | null>(null);
  const [search, setSearch] = useState(currentSearch);
  const [program, setProgram] = useState(currentProgram);
  const [result, setResult] = useState(currentResult);
  const [studentQuery, setStudentQuery] = useState("");
  const deferredStudentQuery = useDeferredValue(studentQuery);
  const [studentOptions, setStudentOptions] = useState<CertificateStudentOption[]>([]);
  const [isLookingUpStudents, setIsLookingUpStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<CertificateStudentOption | null>(null);
  const [issuedAt, setIssuedAt] = useState(getTodayInAppTimeZone);
  const [certificateResult, setCertificateResult] = useState("");
  const [useCustomNumber, setUseCustomNumber] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState("");
  const { start: paginationStart, end: paginationEnd } = getPaginationRange({
    currentPage,
    pageSize,
    totalRows,
  });
  const paginationItems = getPaginationDisplay({ currentPage, totalPages });

  useEffect(() => {
    if (dialog?.mode !== "create" || selectedStudent || deferredStudentQuery.trim().length < 2) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsLookingUpStudents(true);
      searchCertificateStudents(deferredStudentQuery)
        .then((options) => {
          if (!cancelled) setStudentOptions(options);
        })
        .catch(() => {
          if (!cancelled) setStudentOptions([]);
        })
        .finally(() => {
          if (!cancelled) setIsLookingUpStudents(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredStudentQuery, dialog?.mode, selectedStudent]);

  function buildUrl(next: {
    search?: string;
    program?: string;
    result?: string;
    page?: number;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? currentSearch;
    const nextProgram = next.program ?? currentProgram;
    const nextResult = next.result ?? currentResult;
    const nextPage = next.page ?? currentPage;

    if (nextSearch) params.set("search", nextSearch);
    if (nextProgram) params.set("program", nextProgram);
    if (nextResult) params.set("result", nextResult);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/certificates?${query}` : "/admin/certificates";
  }

  function resetCertificateForm() {
    setStudentQuery("");
    setStudentOptions([]);
    setSelectedStudent(null);
    setIssuedAt(getTodayInAppTimeZone());
    setCertificateResult("");
    setUseCustomNumber(false);
    setCertificateNumber("");
  }

  function openCreate() {
    resetCertificateForm();
    setDialog({ mode: "create" });
  }

  function openEdit(certificate: CertificateListItem) {
    setSelectedStudent(certificate.registration);
    setStudentQuery("");
    setStudentOptions([]);
    setIssuedAt(toDateInputValue(certificate.issuedAt));
    setCertificateResult(certificate.result ?? "");
    setUseCustomNumber(certificate.isCustomNumber);
    setCertificateNumber(certificate.certificateNumber);
    setDialog({ mode: "edit", certificate });
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open && !isPending) setDialog(null);
  }

  function selectStudent(student: CertificateStudentOption) {
    setSelectedStudent(student);
    setStudentQuery("");
    setStudentOptions([]);
    setUseCustomNumber(!student.suggestedCertificateNumber);
    setCertificateNumber(student.suggestedCertificateNumber ?? "");
  }

  function handleFiltersSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildUrl({ search, program, result, page: 1 }));
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || !selectedStudent) return;

    startTransition(async () => {
      try {
        if (dialog.mode === "create") {
          await createCertificate({
            registrationId: selectedStudent.id,
            issuedAt,
            result: certificateResult,
            useCustomNumber,
            certificateNumber,
          });
          toast({ title: "Certificate issued", description: "The student record is ready." });
        } else {
          await updateCertificate({
            id: dialog.certificate.id,
            registrationId: selectedStudent.id,
            issuedAt,
            result: certificateResult,
            useCustomNumber,
            certificateNumber,
          });
          toast({ title: "Certificate updated" });
        }
        setDialog(null);
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not save certificate",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive",
        });
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteCertificate(deleteTarget.id);
        toast({ title: "Certificate deleted" });
        setDeleteTarget(null);
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not delete certificate",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive",
        });
      }
    });
  }

  const generatedCertificateNumber = selectedStudent?.suggestedCertificateNumber ?? "";
  const preservedAutomaticNumber =
    dialog?.mode === "edit" && !dialog.certificate.isCustomNumber
      ? dialog.certificate.certificateNumber
      : generatedCertificateNumber;
  const canSaveAutomaticNumber =
    dialog?.mode === "edit" && !dialog.certificate.isCustomNumber
      ? Boolean(dialog.certificate.certificateNumber)
      : Boolean(generatedCertificateNumber);
  const shownCertificateNumber = useCustomNumber
    ? certificateNumber
    : preservedAutomaticNumber;
  const hasFilters = Boolean(currentSearch || currentProgram || currentResult || search || program || result);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleFiltersSubmit} className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search certificate or student"
              className="rounded-xl border-white/60 bg-white/50 pl-10 backdrop-blur-sm"
            />
          </div>
          <Select
            value={program || ALL_VALUE}
            onValueChange={(value) => {
              const nextProgram = value === ALL_VALUE ? "" : value;
              setProgram(nextProgram);
              router.push(buildUrl({ search, program: nextProgram, result, page: 1 }));
            }}
          >
            <SelectTrigger className="w-full rounded-xl border-white/60 bg-white/50 backdrop-blur-sm sm:w-52">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/70 bg-white/95">
              <SelectGroup>
                <SelectItem value={ALL_VALUE}>All programs</SelectItem>
                {programs.map((item) => (
                  <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Result"
            className="w-full rounded-xl border-white/60 bg-white/50 backdrop-blur-sm sm:w-32"
          />
          <Button type="submit" variant="outline" className="rounded-xl">Search</Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setSearch("");
                setProgram("");
                setResult("");
                router.push("/admin/certificates");
              }}
            >
              Clear
            </Button>
          ) : null}
        </form>
        <Button onClick={openCreate} className="rounded-xl bg-primary px-5 shadow-lg hover:bg-primary/90">
          <Plus data-icon="inline-start" />
          Add Certificate
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/65 shadow-xl shadow-gray-200/40 backdrop-blur-md">
        <Table>
          <TableHeader className="bg-white/45">
            <TableRow>
              <TableHead className="px-5">Certificate ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCertificates.map((certificate) => (
              <TableRow key={certificate.id} className="border-gray-100/80">
                <TableCell className="px-5 font-mono text-xs font-bold tracking-wide text-primary-700">
                  {certificate.certificateNumber}
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-gray-900">{certificate.registration.fullName}</div>
                  <div className="text-xs text-gray-500">{certificate.registration.registerId} · {certificate.registration.nicNumber ?? "No NIC"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-gray-800">{certificate.programNameSnapshot}</div>
                  <div className="text-xs text-gray-500">{certificate.programCodeSnapshot} · {certificate.programYearSnapshot}</div>
                </TableCell>
                <TableCell className="text-gray-700">{certificate.result ?? "—"}</TableCell>
                <TableCell className="text-gray-700">{formatAppDate(certificate.issuedAt)}</TableCell>
                <TableCell className="px-5">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => openEdit(certificate)} aria-label={`Edit ${certificate.certificateNumber}`}>
                      <Edit3 />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteTarget(certificate)} aria-label={`Delete ${certificate.certificateNumber}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {initialCertificates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Award className="size-6" /></div>
            <p className="font-semibold text-gray-700">No certificates found</p>
            {!hasFilters ? <Button variant="outline" className="rounded-xl" onClick={openCreate}><Plus data-icon="inline-start" />Add Certificate</Button> : null}
          </div>
        ) : null}
        {totalPages > 1 ? (
          <div className="flex flex-col gap-4 border-t border-gray-100 bg-white/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm text-gray-600">Showing {paginationStart}-{paginationEnd} of {totalRows} certificates</span>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => router.push(buildUrl({ page: 1 }))}>First</Button>
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => router.push(buildUrl({ page: currentPage - 1 }))}>Previous</Button>
              {paginationItems.map((item) => item.type === "ellipsis" ? (
                <span key={item.key} className="px-2 text-sm font-semibold text-gray-400">...</span>
              ) : (
                <Button key={item.page} variant={item.page === currentPage ? "default" : "outline"} size="sm" disabled={item.page === currentPage} aria-current={item.page === currentPage ? "page" : undefined} onClick={() => router.push(buildUrl({ page: item.page }))}>{item.page}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl({ page: currentPage + 1 }))}>Next</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl({ page: totalPages }))}>Last</Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={dialog !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader className="border-b border-gray-100 px-6 py-5">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Award className="size-5 text-primary" />
                {dialog?.mode === "edit" ? "Edit Certificate" : "Add Certificate"}
              </DialogTitle>
              <DialogDescription className="sr-only">Select a student and set the certificate details.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-5 px-6 py-5">
              {dialog?.mode === "create" && !selectedStudent ? (
                <div className="relative">
                  <Label htmlFor="certificate-student-search">Student</Label>
                  <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-gray-400" />
                  <Input
                    id="certificate-student-search"
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    placeholder="NIC or student ID"
                    autoComplete="off"
                    className="mt-2 rounded-xl pl-10"
                    autoFocus
                  />
                  {isLookingUpStudents ? <Loader2 className="absolute bottom-3 right-3 size-4 animate-spin text-primary" /> : null}
                  {studentQuery.trim().length >= 2 && studentOptions.length > 0 ? (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                      {studentOptions.map((student) => (
                        <button key={student.id} type="button" onClick={() => selectStudent(student)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5">
                          <div className="rounded-xl bg-primary/10 p-2 text-primary"><UserRound className="size-4" /></div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">{student.fullName}</div>
                            <div className="truncate text-xs text-gray-500">{student.registerId} · {student.nicNumber ?? "No NIC"} · {student.programName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedStudent ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <div className="rounded-xl bg-white p-2 text-primary shadow-sm"><UserRound className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900">{selectedStudent.fullName}</div>
                      <div className="mt-0.5 text-sm text-gray-600">{selectedStudent.registerId} · {selectedStudent.programName}</div>
                    </div>
                    {dialog?.mode === "create" ? <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => setSelectedStudent(null)}>Change</Button> : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="certificate-issued-at">Issue date</Label>
                      <div className="relative mt-2"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><Input id="certificate-issued-at" type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} required className="rounded-xl pl-10" /></div>
                    </div>
                    <div>
                      <Label htmlFor="certificate-result">Result</Label>
                      <Input id="certificate-result" value={certificateResult} onChange={(event) => setCertificateResult(event.target.value)} placeholder="A, Merit, Distinction" maxLength={80} className="mt-2 rounded-xl" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="custom-certificate-number" checked={useCustomNumber} onCheckedChange={(checked) => setUseCustomNumber(checked === true)} />
                      <Label htmlFor="custom-certificate-number" className="cursor-pointer text-sm font-semibold">Custom certificate ID</Label>
                    </div>
                    <Input
                      value={shownCertificateNumber}
                      onChange={(event) => setCertificateNumber(event.target.value)}
                      disabled={!useCustomNumber}
                      placeholder={useCustomNumber ? "CCA-A00247-200417401029" : "Numeric NIC required"}
                      className="mt-3 rounded-xl bg-white font-mono text-sm disabled:opacity-70"
                      required={useCustomNumber}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <DialogFooter className="border-t border-gray-100 bg-white/70 px-6 py-4">
              <Button type="button" variant="ghost" className="rounded-xl" disabled={isPending} onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" className="rounded-xl bg-primary px-6" disabled={!selectedStudent || isPending || (!useCustomNumber && !canSaveAutomaticNumber)}>
                {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Award data-icon="inline-start" />}
                {dialog?.mode === "edit" ? "Save Changes" : "Issue Certificate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !isPending) setDeleteTarget(null); }}
        title="Delete Certificate"
        description={deleteTarget ? `Delete ${deleteTarget.certificateNumber}? This removes only the certificate record.` : undefined}
        confirmLabel="Delete Certificate"
        variant="destructive"
        isPending={isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
