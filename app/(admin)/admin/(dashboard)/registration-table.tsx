"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    Download,
    X,
    Copy,
    Check,
    Columns3,
    Users,
    CheckCircle2,
    Gift,
    RotateCcw,
    ExternalLink,
    Edit,
    Eye,
    Trash2,
    TrendingUp,
    ChevronsUpDown,
} from "lucide-react";
import {
    toggleRegistrationTrash,
    purgeRegistration,
    getRegistrationsForExport,
} from "./dashboard-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaginationRange } from "@/lib/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    canonicalizeDocumentUrl,
    normalizeDocumentCollection,
} from "@/lib/registration-documents";
import {
    DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS,
    REGISTRATION_EXPORT_FIELDS,
    getOrderedRegistrationExportFields,
    getRegistrationExportCellValue,
    getRegistrationExportFieldsByGroup,
    type RegistrationExportFieldKey,
} from "@/lib/registration-export";

type RegistrationRow = {
    id: number | string | bigint;
    registerId: string;
    programId: string;
    fullName: string;
    nicNumber: string | null;
    passportNumber: string | null;
    emailAddress: string;
    whatsappNumber: string;
    paymentSlip: unknown;
    fullAmount?: string | number | { toString(): string } | null;
    currentPaidAmount?: string | number | { toString(): string } | null;
    createdAt: string | Date;
    program?: {
        name: string;
        code: string;
    } | null;
    deletedAt: string | Date | null;
};

type DashboardStats = {
    activeRegistrations: number;
    trashedRegistrations: number;
    totalRegistrations: number;
    generalRateCount: number;
    specialOfferCount: number;
    topProgram: { id: string; count: number } | null;
};

type ProgramOption = {
    programId: string;
    programName: string;
    yearLabel: string;
    programGroup: string | null;
};

interface RegistrationTableProps {
    initialRegistrations: RegistrationRow[];
    initialStats: DashboardStats;
    programs: ProgramOption[];
    currentScope: string;
    currentSearch: string;
    currentProgram: string[];
    currentProgramGroup: string;
    currentIntakeYear: string;
    currentTag: string;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
}

const EXPORT_FIELD_GROUPS = getRegistrationExportFieldsByGroup();
const ALL_EXPORT_FIELD_KEYS = REGISTRATION_EXPORT_FIELDS.map(
    (field) => field.key,
);
const ALL_FILTER_VALUE = "__all__";
const alphanumericCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

function escapeCsvCell(value: string): string {
    const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
}

export default function RegistrationTable({
    initialRegistrations,
    initialStats,
    programs,
    currentScope,
    currentSearch,
    currentProgram,
    currentProgramGroup,
    currentIntakeYear,
    currentTag,
    currentPage,
    pageSize,
    totalPages,
    totalRows,
}: RegistrationTableProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [searchInput, setSearchInput] = useState(currentSearch);
    const [programInput, setProgramInput] = useState<string[]>(currentProgram);
    const [programGroupInput, setProgramGroupInput] = useState(
        currentProgramGroup,
    );
    const [intakeYearInput, setIntakeYearInput] = useState(currentIntakeYear);
    const [isExporting, setIsExporting] = useState(false);
    const [trashConfirm, setTrashConfirm] = useState<{ id: number; restore: boolean } | null>(null);
    const [purgeConfirm, setPurgeConfirm] = useState<{ id: number } | null>(null);
    const [isTrashPending, setIsTrashPending] = useState(false);
    const [isPurgePending, setIsPurgePending] = useState(false);
    const [copiedWhatsappId, setCopiedWhatsappId] = useState<string | null>(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isProgramFilterOpen, setIsProgramFilterOpen] = useState(false);
    const [programQuery, setProgramQuery] = useState("");
    const [selectedExportFields, setSelectedExportFields] = useState<
        RegistrationExportFieldKey[]
    >([...DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS]);

    useEffect(() => {
        setSearchInput(currentSearch);
        setProgramInput(currentProgram);
        setProgramGroupInput(currentProgramGroup);
        setIntakeYearInput(currentIntakeYear);
    }, [currentSearch, currentProgram, currentProgramGroup, currentIntakeYear]);

    const deferredProgramQuery = useDeferredValue(programQuery);
    const normalizedProgramQuery = deferredProgramQuery.trim().toLowerCase();
    const availableProgramGroups = Array.from(
        new Set(
            programs
                .map((program) => program.programGroup)
                .filter((programGroup): programGroup is string =>
                    Boolean(programGroup),
                ),
        ),
    ).sort((left, right) => alphanumericCollator.compare(left, right));
    const availableIntakeYears = Array.from(
        new Set(
            programs
                .map((program) => program.yearLabel.trim())
                .filter((yearLabel) => yearLabel.length > 0),
        ),
    ).sort((left, right) => alphanumericCollator.compare(right, left));
    const visibleProgramOptions = programs.filter((program) => {
        if (!normalizedProgramQuery) return true;

        return (
            program.programId.toLowerCase().includes(normalizedProgramQuery) ||
            program.programName.toLowerCase().includes(normalizedProgramQuery)
        );
    });

    function buildUrl(params: {
        scope?: string;
        search?: string;
        program?: string[];
        programGroup?: string;
        intakeYear?: string;
        tag?: string;
        page?: number;
    }) {
        const sp = new URLSearchParams();
        sp.set("scope", params.scope || currentScope);

        const search =
            params.search !== undefined ? params.search : currentSearch;
        const program =
            params.program !== undefined ? params.program : currentProgram;
        const programGroup =
            params.programGroup !== undefined
                ? params.programGroup
                : currentProgramGroup;
        const intakeYear =
            params.intakeYear !== undefined
                ? params.intakeYear
                : currentIntakeYear;
        const tag = params.tag !== undefined ? params.tag : currentTag;
        const page = params.page !== undefined ? params.page : currentPage;

        if (search) sp.set("search", search);
        program.forEach((programId) => {
            if (programId) {
                sp.append("program_filter", programId);
            }
        });
        if (programGroup) {
            sp.set("program_group_filter", programGroup);
        }
        if (intakeYear) {
            sp.set("intake_year_filter", intakeYear);
        }
        if (tag) sp.set("tag_filter", tag);
        if (page > 1) sp.set("page", String(page));

        return `/admin?${sp.toString()}`;
    }

    function handleFilterSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.push(
            buildUrl({
                search: searchInput,
                program: programInput,
                programGroup: programGroupInput,
                intakeYear: intakeYearInput,
                page: 1,
            }),
        );
    }

    function clearFilters() {
        setSearchInput("");
        setProgramInput([]);
        setProgramGroupInput("");
        setIntakeYearInput("");
        setProgramQuery("");
        setIsProgramFilterOpen(false);
        router.push("/admin?scope=active");
    }

    function handleProgramPopoverChange(open: boolean) {
        setIsProgramFilterOpen(open);
        if (!open) {
            setProgramQuery("");
        }
    }

    function handleProgramToggle(programId: string) {
        setProgramInput((current) =>
            current.includes(programId)
                ? current.filter((value) => value !== programId)
                : [...current, programId],
        );
    }

    function clearProgramSelection() {
        setProgramInput([]);
        setProgramQuery("");
    }

    const selectedProgramLabels = programInput
        .map((programId) =>
            programs.find((program) => program.programId === programId),
        )
        .filter(
            (program): program is ProgramOption => Boolean(program),
        );
    const appliedProgramLabels = currentProgram
        .map((programId) =>
            programs.find((program) => program.programId === programId),
        )
        .filter(
            (program): program is ProgramOption => Boolean(program),
        );

    const programTriggerLabel =
        selectedProgramLabels.length === 0
            ? "All Programs"
            : selectedProgramLabels.length === 1
              ? `${selectedProgramLabels[0].programId} • ${selectedProgramLabels[0].programName}`
              : `${selectedProgramLabels.length} programs selected`;

    const programSummaryLabel =
        selectedProgramLabels.length === 0
            ? ""
            : selectedProgramLabels.length <= 2
              ? selectedProgramLabels
                    .map((program) => program.programId)
                    .join(", ")
              : `${selectedProgramLabels.length} selected`;

    const selectedProgramExportLabel =
        appliedProgramLabels.length === 0
            ? ""
            : appliedProgramLabels.length <= 3
              ? appliedProgramLabels
                    .map((program) => program.programId)
                    .join(", ")
              : `${appliedProgramLabels.length} programs`;
    const selectedProgramGroupExportLabel = currentProgramGroup;
    const selectedIntakeYearExportLabel = currentIntakeYear;

    function applyProgramSelectionAndClose() {
        setProgramQuery("");
        setIsProgramFilterOpen(false);
    }

    async function handleTrash(id: number, restore: boolean) {
        setTrashConfirm({ id, restore });
    }

    async function confirmTrash() {
        if (!trashConfirm) return;
        setIsTrashPending(true);
        try {
            await toggleRegistrationTrash(trashConfirm.id, trashConfirm.restore);
            setTrashConfirm(null);
            router.refresh();
        } catch {
            toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
        } finally {
            setIsTrashPending(false);
        }
    }

    async function handlePurge(id: number) {
        setPurgeConfirm({ id });
    }

    async function confirmPurge() {
        if (!purgeConfirm) return;
        setIsPurgePending(true);
        try {
            await purgeRegistration(purgeConfirm.id);
            setPurgeConfirm(null);
            router.refresh();
        } catch {
            toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
        } finally {
            setIsPurgePending(false);
        }
    }

    async function handleExport() {
        if (isExporting) return;
        const orderedFields = getOrderedRegistrationExportFields(
            selectedExportFields,
        );

        if (!orderedFields.length) {
            toast({
                title: "Select Columns",
                description: "Choose at least one column to export.",
                variant: "destructive",
            });
            return;
        }

        setIsExporting(true);
        try {
            const allRegistrations = await getRegistrationsForExport({
                scope: currentScope,
                search: currentSearch,
                programFilter: currentProgram,
                programGroupFilter: currentProgramGroup,
                intakeYearFilter: currentIntakeYear,
                tagFilter: currentTag,
            }, orderedFields.map((field) => field.key));
            if (allRegistrations.length === 0) {
                toast({
                    title: "No Data",
                    description:
                        "No registrations match the current filters for export.",
                });
                return;
            }

            const headers = orderedFields.map((field) =>
                escapeCsvCell(field.label),
            );

            const csvData = allRegistrations.map((reg) =>
                orderedFields.map((field) =>
                    escapeCsvCell(
                        getRegistrationExportCellValue(reg, field.key),
                    ),
                ),
            );

            const csvContent = [headers, ...csvData]
                .map((row) => row.join(","))
                .join("\n");
            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `registrations_${currentScope}_${new Date().toISOString().split("T")[0]}.csv`,
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setIsExportDialogOpen(false);
            toast({
                title: "Export Ready",
                description: `${allRegistrations.length} registration(s) exported.`,
            });
        } catch (error) {
            console.error("Failed to export registrations CSV:", error);
            toast({ title: "Export Failed", description: "Failed to export CSV. Please try again.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    }

    function handleToggleExportField(
        fieldKey: RegistrationExportFieldKey,
        checked: boolean,
    ) {
        setSelectedExportFields((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(fieldKey);
            } else {
                next.delete(fieldKey);
            }

            return ALL_EXPORT_FIELD_KEYS.filter((key) => next.has(key));
        });
    }

    function getPaymentSlipUrl(paymentSlip: unknown): string | null {
        const slips = normalizeDocumentCollection(paymentSlip);
        if (!slips.length) return null;
        return canonicalizeDocumentUrl(slips[0].url);
    }

    async function handleCopyWhatsapp(registrationId: string, whatsappNumber: string) {
        const value = whatsappNumber.trim();
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            setCopiedWhatsappId(registrationId);
            setTimeout(() => {
                setCopiedWhatsappId((current) =>
                    current === registrationId ? null : current,
                );
            }, 1200);
        } catch {
            toast({
                title: "Copy Failed",
                description: "Unable to copy WhatsApp number.",
                variant: "destructive",
            });
        }
    }

    const hasFilters =
        currentSearch ||
        currentProgram.length > 0 ||
        currentProgramGroup ||
        currentIntakeYear ||
        currentTag ||
        currentScope !== "active";
    const { start: paginationStart, end: paginationEnd } = getPaginationRange({
        currentPage,
        pageSize,
        totalRows,
    });

    return (
        <>
        <div className="space-y-6">
            {/* Scope Switch */}
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    prefetch={false}
                    href={buildUrl({ scope: "active", page: 1 })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        currentScope === "active"
                            ? "bg-primary text-white shadow-lg scale-105"
                            : "bg-white/60 text-gray-700 border border-white/60 hover:bg-white/80"
                    }`}
                >
                    Active ({initialStats.activeRegistrations})
                </Link>
                <Link
                    prefetch={false}
                    href={buildUrl({ scope: "trashed", page: 1 })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        currentScope === "trashed"
                            ? "bg-red-600 text-white shadow-lg scale-105"
                            : "bg-white/60 text-gray-700 border border-white/60 hover:bg-white/80"
                    }`}
                >
                    Trash ({initialStats.trashedRegistrations})
                </Link>
                <Link
                    prefetch={false}
                    href={buildUrl({ scope: "all", page: 1 })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        currentScope === "all"
                            ? "bg-indigo-600 text-white shadow-lg scale-105"
                            : "bg-white/60 text-gray-700 border border-white/60 hover:bg-white/80"
                    }`}
                >
                    All ({initialStats.totalRegistrations})
                </Link>
            </div>

            {/* Filters & Actions */}
            <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg ring-1 ring-black/5">
                <form onSubmit={handleFilterSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Search Students
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) =>
                                        setSearchInput(e.target.value)
                                    }
                                    placeholder="Name, Email, NIC or WhatsApp..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Program Filter
                            </label>
                            <Popover
                                open={isProgramFilterOpen}
                                onOpenChange={handleProgramPopoverChange}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-between rounded-xl border-gray-200 bg-white/50 px-4 py-2 font-medium text-gray-700 hover:bg-white/80"
                                    >
                                        <span className="min-w-0 text-left">
                                            {programInput.length > 0 ? (
                                                <>
                                                    <span className="block truncate">
                                                        {programTriggerLabel}
                                                    </span>
                                                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                        {programSummaryLabel}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-gray-500">
                                                    All Programs
                                                </span>
                                            )}
                                        </span>
                                        <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur-xl"
                                >
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                value={programQuery}
                                                onChange={(event) =>
                                                    setProgramQuery(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search by code or program name..."
                                                className="rounded-xl border-gray-200 bg-white pl-10"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    clearProgramSelection()
                                                }
                                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                                    programInput.length === 0
                                                        ? "bg-primary text-white"
                                                        : "text-gray-700 hover:bg-white"
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-semibold">
                                                        All Programs
                                                    </p>
                                                    <p
                                                        className={`text-xs ${
                                                            programInput.length === 0
                                                                ? "text-white/80"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        Remove the program-specific filter.
                                                    </p>
                                                </div>
                                                {programInput.length === 0 && (
                                                    <Check className="h-4 w-4 shrink-0" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="max-h-72 overflow-y-auto pr-1">
                                            <div className="space-y-1">
                                                {visibleProgramOptions.length ===
                                                0 ? (
                                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-8 text-center">
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            No matching programs
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Try a code or part of the program name.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    visibleProgramOptions.map(
                                                        (program) => {
                                                            const isSelected =
                                                                programInput.includes(
                                                                    program.programId,
                                                                );

                                                            return (
                                                                <button
                                                                    key={
                                                                        program.programId
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleProgramToggle(
                                                                            program.programId,
                                                                        )
                                                                    }
                                                                    className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                                                                        isSelected
                                                                            ? "border-primary bg-primary/8"
                                                                            : "border-transparent bg-white/70 hover:border-gray-200 hover:bg-white"
                                                                    }`}
                                                                >
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black uppercase tracking-widest text-primary/80">
                                                                            {
                                                                                program.programId
                                                                            }
                                                                        </p>
                                                                        <p className="mt-1 text-sm font-semibold text-gray-900">
                                                                            {
                                                                                program.programName
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                                    )}
                                                                </button>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                            <p className="text-xs text-gray-500">
                                                {programInput.length === 0
                                                    ? "All programs included"
                                                    : `${programInput.length} program(s) selected`}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearProgramSelection}
                                                    className="rounded-xl"
                                                >
                                                    Clear
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={applyProgramSelectionAndClose}
                                                    className="rounded-xl bg-primary hover:bg-primary/90"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 pt-2 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-linear-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Apply Filters
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsExportDialogOpen(true)}
                                disabled={isExporting}
                                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="program-group-filter"
                                    className="block text-xs font-bold uppercase tracking-wider text-gray-500"
                                >
                                    Program Track
                                </Label>
                                <Select
                                    value={
                                        programGroupInput || ALL_FILTER_VALUE
                                    }
                                    onValueChange={(value) =>
                                        setProgramGroupInput(
                                            value === ALL_FILTER_VALUE
                                                ? ""
                                                : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="program-group-filter"
                                        className="h-11 w-full rounded-xl border-gray-200 bg-white/70 px-4 text-left font-medium text-gray-700"
                                    >
                                        <SelectValue placeholder="All tracks" />
                                    </SelectTrigger>
                                    <SelectContent
                                        align="end"
                                        className="rounded-xl border-white/70 bg-white/95"
                                    >
                                        <SelectItem value={ALL_FILTER_VALUE}>
                                            All tracks
                                        </SelectItem>
                                        {availableProgramGroups.map(
                                            (programGroup) => (
                                                <SelectItem
                                                    key={programGroup}
                                                    value={programGroup}
                                                >
                                                    {programGroup}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="intake-year-filter"
                                    className="block text-xs font-bold uppercase tracking-wider text-gray-500"
                                >
                                    Intake Year
                                </Label>
                                <Select
                                    value={intakeYearInput || ALL_FILTER_VALUE}
                                    onValueChange={(value) =>
                                        setIntakeYearInput(
                                            value === ALL_FILTER_VALUE
                                                ? ""
                                                : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="intake-year-filter"
                                        className="h-11 w-full rounded-xl border-gray-200 bg-white/70 px-4 text-left font-medium text-gray-700"
                                    >
                                        <SelectValue placeholder="All intake years" />
                                    </SelectTrigger>
                                    <SelectContent
                                        align="end"
                                        className="rounded-xl border-white/70 bg-white/95"
                                    >
                                        <SelectItem value={ALL_FILTER_VALUE}>
                                            All intake years
                                        </SelectItem>
                                        {availableIntakeYears.map(
                                            (intakeYear) => (
                                                <SelectItem
                                                    key={intakeYear}
                                                    value={intakeYear}
                                                >
                                                    {intakeYear}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                                Active Students
                            </p>
                            <p className="text-3xl font-black bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                {initialStats.activeRegistrations}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <Link
                    prefetch={false}
                    href={buildUrl({
                        tag:
                            currentTag === "General Rate" ? "" : "General Rate",
                        page: 1,
                    })}
                    className={`p-6 backdrop-blur-xl border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] group ${
                        currentTag === "General Rate"
                            ? "bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500"
                            : "bg-white/60 border-white/60"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                                General Rate
                            </p>
                            <p className="text-3xl font-black bg-linear-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                {initialStats.generalRateCount}
                            </p>
                        </div>
                        <div
                            className={`p-3 rounded-xl transition-colors duration-300 ${
                                currentTag === "General Rate"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                            }`}
                        >
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>
                </Link>

                <Link
                    prefetch={false}
                    href={buildUrl({
                        tag:
                            currentTag === "Special 50% Offer"
                                ? ""
                                : "Special 50% Offer",
                        page: 1,
                    })}
                    className={`p-6 backdrop-blur-xl border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] group ${
                        currentTag === "Special 50% Offer"
                            ? "bg-purple-100/90 border-purple-400 ring-2 ring-purple-500"
                            : "bg-white/60 border-white/60"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                                Special Offer
                            </p>
                            <p className="text-3xl font-black bg-linear-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                {initialStats.specialOfferCount}
                            </p>
                        </div>
                        <div
                            className={`p-3 rounded-xl transition-colors duration-300 ${
                                currentTag === "Special 50% Offer"
                                    ? "bg-purple-600 text-white"
                                    : "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
                            }`}
                        >
                            <Gift className="w-6 h-6" />
                        </div>
                    </div>
                </Link>

                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] group">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                                Top Program
                            </p>
                            <p className="text-lg font-black text-orange-600 truncate">
                                {initialStats.topProgram?.id || "N/A"}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                {initialStats.topProgram?.count || 0}{" "}
                                Registrations
                            </p>
                        </div>
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300 ml-4">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Table */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white/40">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    ID
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Program
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Student Name
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    NIC/Passport
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    WhatsApp
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Slip
                                </th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/20 divide-y divide-gray-100">
                            {initialRegistrations.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-6 py-20 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <Users className="w-10 h-10 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-gray-600">
                                                    No registrations found
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Try adjusting your search
                                                    criteria
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                initialRegistrations.map((reg) => {
                                    const paymentUrl = getPaymentSlipUrl(
                                        reg.paymentSlip,
                                    );
                                    const registrationId = Number(reg.id);
                                    const registrationIdLabel = String(reg.id);
                                    return (
                                        <tr
                                            key={registrationIdLabel}
                                            className="hover:bg-white/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                                                {reg.registerId}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-bold text-gray-900 uppercase tracking-tight">
                                                    {reg.programId}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                                                    {reg.program?.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                                {reg.fullName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                {reg.nicNumber ||
                                                    reg.passportNumber ||
                                                    "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {reg.emailAddress}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleCopyWhatsapp(
                                                                registrationIdLabel,
                                                                reg.whatsappNumber,
                                                            )
                                                        }
                                                        className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        aria-label="Copy WhatsApp number"
                                                    >
                                                        {copiedWhatsappId === registrationIdLabel ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                    <span>{reg.whatsappNumber || "N/A"}</span>
                                                    {copiedWhatsappId === registrationIdLabel && (
                                                        <span className="text-[10px] font-semibold text-emerald-600">
                                                            Copied
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {paymentUrl ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <a
                                                            href={paymentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                            Slip
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-gray-300 italic">
                                                        None
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {reg.deletedAt ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleTrash(
                                                                        registrationId,
                                                                        true,
                                                                    )
                                                                }
                                                                className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handlePurge(
                                                                        registrationId,
                                                                    )
                                                                }
                                                                className="h-8"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                                Purge
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                asChild
                                                                className="h-9 w-9 bg-white shadow-sm hover:border-primary hover:text-primary"
                                                            >
                                                                <Link
                                                                    prefetch={false}
                                                                    href={`/admin/registrations/${registrationIdLabel}`}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                asChild
                                                                className="h-9 w-9 bg-white shadow-sm hover:border-amber-500 hover:text-amber-500"
                                                            >
                                                                <Link
                                                                    prefetch={false}
                                                                    href={`/admin/registrations/${registrationIdLabel}/edit`}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleTrash(
                                                                        registrationId,
                                                                        false,
                                                                    )
                                                                }
                                                                className="h-9 w-9 bg-white shadow-sm hover:border-red-500 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white/40">
                        <span className="text-sm text-gray-600">
                            Showing {paginationStart}-{paginationEnd} of{" "}
                            {totalRows} registrations
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    router.push(
                                        buildUrl({ page: currentPage - 1 }),
                                    )
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() =>
                                    router.push(
                                        buildUrl({ page: currentPage + 1 }),
                                    )
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <ConfirmDialog
            open={!!trashConfirm}
            onOpenChange={(open) => { if (!open) setTrashConfirm(null); }}
            title={trashConfirm?.restore ? "Restore Registration" : "Trash Registration"}
            description={`Are you sure you want to ${trashConfirm?.restore ? "restore" : "trash"} this registration?`}
            confirmLabel={trashConfirm?.restore ? "Restore" : "Move to Trash"}
            variant={trashConfirm?.restore ? "default" : "destructive"}
            isPending={isTrashPending}
            onConfirm={confirmTrash}
        />

        <ConfirmDialog
            open={!!purgeConfirm}
            onOpenChange={(open) => { if (!open) setPurgeConfirm(null); }}
            title="Permanently Delete Registration"
            description="PERMANENT DELETE: Are you sure? This cannot be undone."
            confirmLabel="Delete Permanently"
            variant="destructive"
            isPending={isPurgePending}
            onConfirm={confirmPurge}
        />

        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogContent className="sm:max-w-4xl rounded-3xl bg-white/95 backdrop-blur-xl border-white/60 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-6 pt-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Columns3 className="w-5 h-5 text-emerald-600" />
                            Export Registrations
                        </DialogTitle>
                        <DialogDescription>
                            Pick the columns to include. Current scope and filters are applied to the export.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="shrink-0 px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                        <div className="text-sm text-emerald-900">
                            <p className="font-semibold">
                                {selectedExportFields.length} column(s) selected
                            </p>
                            <p className="text-xs text-emerald-700">
                                Scope: {currentScope} {selectedProgramExportLabel ? `• Programs: ${selectedProgramExportLabel}` : ""} {selectedProgramGroupExportLabel ? `• Track: ${selectedProgramGroupExportLabel}` : ""} {selectedIntakeYearExportLabel ? `• Intake Year: ${selectedIntakeYearExportLabel}` : ""} {currentTag ? `• Tag: ${currentTag}` : ""} {currentSearch ? `• Search: ${currentSearch}` : ""}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setSelectedExportFields([...ALL_EXPORT_FIELD_KEYS])
                                }
                                className="rounded-xl"
                            >
                                Select All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setSelectedExportFields([
                                        ...DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS,
                                    ])
                                }
                                className="rounded-xl"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Defaults
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pr-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                        {EXPORT_FIELD_GROUPS.map((group) => (
                            <div
                                key={group.key}
                                className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm"
                            >
                                <div className="mb-3">
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {group.label}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Choose the columns from this section.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {group.fields.map((field) => {
                                        const isChecked =
                                            selectedExportFields.includes(field.key);

                                        return (
                                            <div
                                                key={field.key}
                                                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                                            >
                                                <Checkbox
                                                    id={`export-field-${field.key}`}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) =>
                                                        handleToggleExportField(
                                                            field.key,
                                                            checked === true,
                                                        )
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <Label
                                                    htmlFor={`export-field-${field.key}`}
                                                    className="cursor-pointer space-y-1"
                                                >
                                                    <span className="block text-sm font-semibold text-gray-900">
                                                        {field.label}
                                                    </span>
                                                    <span className="block text-xs font-normal text-gray-500">
                                                        {field.description}
                                                    </span>
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-gray-100 bg-white/90 px-6 py-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsExportDialogOpen(false)}
                        className="rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting || selectedExportFields.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-8"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? "Exporting..." : "Download CSV"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
