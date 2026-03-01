"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    Download,
    X,
    Users,
    CheckCircle2,
    Gift,
    RotateCcw,
    ExternalLink,
    Edit,
    Eye,
    Trash2,
    TrendingUp,
} from "lucide-react";
import {
    toggleRegistrationTrash,
    purgeRegistration,
    getRegistrationsForExport,
} from "./dashboard-actions";
import { Button } from "@/components/ui/button";
import { formatAppDate } from "@/lib/formatters";
import { getPaginationRange } from "@/lib/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

type Registration = {
    id: number;
    registerId: string;
    programId: string;
    programName: string;
    fullName: string;
    nicNumber: string | null;
    passportNumber: string | null;
    emailAddress: string;
    whatsappNumber: string;
    paymentSlip: any;
    deletedAt: string | null;
};

interface RegistrationTableProps {
    initialRegistrations: any[];
    initialStats: any;
    programs: { programId: string; programName: string }[];
    currentScope: string;
    currentSearch: string;
    currentProgram: string;
    currentTag: string;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
}

export default function RegistrationTable({
    initialRegistrations,
    initialStats,
    programs,
    currentScope,
    currentSearch,
    currentProgram,
    currentTag,
    currentPage,
    pageSize,
    totalPages,
    totalRows,
}: RegistrationTableProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [searchInput, setSearchInput] = useState(currentSearch);
    const [programInput, setProgramInput] = useState(currentProgram);
    const [isExporting, setIsExporting] = useState(false);
    const [trashConfirm, setTrashConfirm] = useState<{ id: number; restore: boolean } | null>(null);
    const [purgeConfirm, setPurgeConfirm] = useState<{ id: number } | null>(null);
    const [isTrashPending, setIsTrashPending] = useState(false);
    const [isPurgePending, setIsPurgePending] = useState(false);

    function buildUrl(params: {
        scope?: string;
        search?: string;
        program?: string;
        tag?: string;
        page?: number;
    }) {
        const sp = new URLSearchParams();
        sp.set("scope", params.scope || currentScope);

        const search =
            params.search !== undefined ? params.search : currentSearch;
        const program =
            params.program !== undefined ? params.program : currentProgram;
        const tag = params.tag !== undefined ? params.tag : currentTag;
        const page = params.page !== undefined ? params.page : currentPage;

        if (search) sp.set("search", search);
        if (program) sp.set("program_filter", program);
        if (tag) sp.set("tag_filter", tag);
        if (page > 1) sp.set("page", String(page));

        return `/admin?${sp.toString()}`;
    }

    function handleFilterSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.push(
            buildUrl({ search: searchInput, program: programInput, page: 1 }),
        );
    }

    function clearFilters() {
        setSearchInput("");
        setProgramInput("");
        router.push("/admin?scope=active");
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

        setIsExporting(true);
        try {
            const allRegistrations = await getRegistrationsForExport({
                scope: currentScope,
                search: currentSearch,
                programFilter: currentProgram,
                tagFilter: currentTag,
            });
            if (allRegistrations.length === 0) return;

            const headers = [
                "ID",
                "Program ID",
                "Program Name",
                "Full Name",
                "NIC/Passport",
                "Email",
                "WhatsApp",
                "Full Amount",
                "Paid Amount",
                "Created At",
            ];

            const csvData = allRegistrations.map((reg) => [
                reg.registerId,
                reg.programId,
                reg.program?.name || "",
                `"${reg.fullName.replace(/"/g, '""')}"`,
                reg.nicNumber || reg.passportNumber || "N/A",
                reg.emailAddress,
                reg.whatsappNumber,
                reg.fullAmount || "0",
                reg.currentPaidAmount || "0",
                formatAppDate(reg.createdAt),
            ]);

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
                `registrations_${new Date().toISOString().split("T")[0]}.csv`,
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export registrations CSV:", error);
            toast({ title: "Export Failed", description: "Failed to export CSV. Please try again.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    }

    function getPaymentSlipUrl(paymentSlip: any): string | null {
        if (!paymentSlip) return null;
        if (Array.isArray(paymentSlip) && paymentSlip[0]?.url)
            return paymentSlip[0].url;
        if (typeof paymentSlip === "object" && paymentSlip?.url)
            return paymentSlip.url;
        return null;
    }

    const hasFilters =
        currentSearch ||
        currentProgram ||
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
                            <select
                                value={programInput}
                                onChange={(e) =>
                                    setProgramInput(e.target.value)
                                }
                                className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none"
                            >
                                <option value="">All Programs</option>
                                {programs.map((p) => (
                                    <option
                                        key={p.programId}
                                        value={p.programId}
                                    >
                                        {p.programName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-linear-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Apply Filters
                        </button>

                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? "Exporting..." : "Export CSV"}
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
                                    return (
                                        <tr
                                            key={reg.id}
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
                                                {reg.whatsappNumber}
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
                                                                        reg.id,
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
                                                                        reg.id,
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
                                                                    href={`/admin/registrations/${reg.id}`}
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
                                                                    href={`/admin/registrations/${reg.id}/edit`}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleTrash(
                                                                        reg.id,
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
        </>
    );
}
