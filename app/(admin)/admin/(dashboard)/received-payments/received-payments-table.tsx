"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { approvePaymentSlip, declinePaymentSlip } from "./received-payments-actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatAppDate } from "@/lib/formatters";

export default function ReceivedPaymentsTable({
    initialPayments,
    currentSearch,
    currentStatus = "all",
    currentPage,
    totalPages,
    totalRows,
}: {
    initialPayments: any[];
    currentSearch: string;
    currentStatus?: string;
    currentPage: number;
    totalPages: number;
    totalRows: number;
}) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState(currentSearch);
    const [statusFilter, setStatusFilter] = useState(currentStatus);
    const [isApproving, setIsApproving] = useState<string | null>(null);
    const [isDeclining, setIsDeclining] = useState<string | null>(null);
    const [approveModal, setApproveModal] = useState<{
        registrationId: string;
        slipIndex: number;
        slipUrl: string;
        fullName: string;
    } | null>(null);
    const [approveAmount, setApproveAmount] = useState<string>("");

    function buildUrl(params: {
        search?: string;
        status?: string;
        page?: number;
    }) {
        const sp = new URLSearchParams();
        const nextSearch = params.search ?? currentSearch;
        const nextStatus = params.status ?? currentStatus;
        const nextPage = params.page ?? currentPage;

        if (nextSearch) sp.set("search", nextSearch);
        if (nextStatus && nextStatus !== "all") sp.set("status", nextStatus);
        if (nextPage > 1) sp.set("page", String(nextPage));

        const query = sp.toString();
        return query
            ? `/admin/received-payments?${query}`
            : "/admin/received-payments";
    }

    // Filter submit handler
    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(
            buildUrl({
                search: searchQuery,
                status: statusFilter,
                page: 1,
            }),
        );
    };

    const handleClearFilter = () => {
        setSearchQuery("");
        setStatusFilter("all");
        router.push("/admin/received-payments");
    };

    const handleDecline = async (registrationId: string, slipIndex: number) => {
        if (!confirm("Are you sure you want to decline this payment slip?")) return;
        setIsDeclining(`${registrationId}-${slipIndex}`);
        try {
            await declinePaymentSlip(registrationId, slipIndex);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to decline slip.");
        } finally {
            setIsDeclining(null);
        }
    };

    const handleApproveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approveModal || !approveAmount) return;

        const amountNum = parseFloat(approveAmount);
        if (amountNum <= 0 || isNaN(amountNum)) {
            alert("Please enter a valid amount greater than 0.");
            return;
        }

        setIsApproving(`${approveModal.registrationId}-${approveModal.slipIndex}`);
        try {
            await approvePaymentSlip(approveModal.registrationId, approveModal.slipIndex, amountNum);
            setApproveModal(null);
            setApproveAmount("");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to approve and log payment.");
        } finally {
            setIsApproving(null);
        }
    };


    return (
        <div className="space-y-6">
            {/* Search Filter Head */}
            <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg ring-1 ring-black/5">
                <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Global Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Student Name, NIC, Email, or WhatsApp..."
                                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-48">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Status Filter
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none"
                        >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="declined">Declined</option>
                            <option value="all">All Slips</option>
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                            Filter
                        </button>
                        {(currentSearch || currentStatus !== "all") && (
                            <button
                                type="button"
                                onClick={handleClearFilter}
                                className="px-6 py-2.5 bg-gray-500 text-white font-bold rounded-xl shadow-md hover:bg-gray-600 transition-all"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Main Data Table */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white/40">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">NIC / Passport</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Uploaded Slip</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/20 divide-y divide-gray-100">
                            {initialPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                                        No pending slips to review.
                                    </td>
                                </tr>
                            ) : (
                                initialPayments.map((payment) => {
                                    const actionKeyId = `${payment.registrationId}-${payment.slipIndex}`;
                                    const loadingApprove = isApproving === actionKeyId;
                                    const loadingDecline = isDeclining === actionKeyId;

                                    return (
                                        <tr key={payment.slipId} className="hover:bg-white/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                                                {payment.registerId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                                {payment.fullName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium tracking-wide">
                                                {payment.identifier}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <p>{payment.emailAddress}</p>
                                                <p className="font-semibold text-indigo-600 text-xs mt-1">{payment.whatsappNumber}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-8 border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    <a href={payment.slipUrl} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Document
                                                    </a>
                                                </Button>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    Uploaded: {formatAppDate(payment.uploadedAt)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {payment.status === "approved" && (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Approved
                                                        </span>
                                                    )}
                                                    {payment.status === "declined" && (
                                                        <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                                                            <XCircle className="w-3 h-3" /> Declined
                                                        </span>
                                                    )}
                                                    {(payment.status === "pending" || !payment.status) && (
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {payment.status === "pending" || !payment.status ? (
                                                    <div className="flex flex-col xl:flex-row items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={loadingApprove || loadingDecline}
                                                            onClick={() => setApproveModal({
                                                                registrationId: payment.registrationId,
                                                                slipIndex: payment.slipIndex,
                                                                slipUrl: payment.slipUrl,
                                                                fullName: payment.fullName
                                                            })}
                                                            className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 w-full xl:w-24"
                                                        >
                                                            {loadingApprove ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</>}
                                                        </Button>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={loadingApprove || loadingDecline}
                                                            onClick={() => handleDecline(payment.registrationId, payment.slipIndex)}
                                                            className="h-8 w-full xl:w-24"
                                                        >
                                                            {loadingDecline ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : <><XCircle className="w-3.5 h-3.5 mr-1" /> Decline</>}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 font-medium italic">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white/40">
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages} ({initialPayments.length} / {totalRows} slips)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
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
                                disabled={currentPage === totalPages}
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

            {/* Approval Modal */}
            {approveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Approve Payment</h3>
                            <p className="text-sm text-gray-500 mb-6">Manually enter the verified paid amount to finalize this slip for <strong>{approveModal.fullName}</strong>.</p>

                            <div className="flex justify-center mb-6">
                                <a href={approveModal.slipUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-4 h-4" /> Open Payment Slip Reference
                                </a>
                            </div>

                            <form onSubmit={handleApproveSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Verified Amount (LKR) *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs.</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={approveAmount}
                                                onChange={(e) => setApproveAmount(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                                                placeholder="e.g., 25000"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setApproveModal(null)}
                                            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!!isApproving}
                                            className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                                        >
                                            {isApproving ? "Processing..." : "Confirm & Apply"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
