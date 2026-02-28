import { getFinanceStats, getPaymentLedger } from "./finance-actions";
import FinanceLedgerClient from "./finance-ledger-client";
import { Wallet, TrendingUp, Users, Receipt } from "lucide-react";

export default async function FinancePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const search = (params.search as string) || "";
    const page = Math.max(
        1,
        Number.isFinite(Number(params.page)) ? Number(params.page) : 1,
    );

    const [stats, ledgerResult] = await Promise.all([
        getFinanceStats(),
        getPaymentLedger({ search, page, pageSize: 20 }),
    ]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-emerald-600" />
                        Finance Ledger
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Monitor revenue, track student payments, and manage
                        financial health.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                            Verified
                        </span>
                    </div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Total Paid
                    </p>
                    <p className="text-3xl font-black bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Rs. {parseFloat(stats.totalRevenue).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-gray-400">
                        Excludes voided: Rs.{" "}
                        {parseFloat(stats.voidedAmount).toLocaleString()}
                    </p>
                </div>

                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Receipt className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Transactions
                    </p>
                    <p className="text-3xl font-black bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {stats.totalPayments}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-gray-400">
                        Voided hidden: {stats.voidedPayments}
                    </p>
                </div>

                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-400/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Students
                    </p>
                    <p className="text-3xl font-black bg-linear-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        {stats.activeRegistrations}
                    </p>
                </div>
            </div>

            <FinanceLedgerClient
                initialLedger={ledgerResult.data}
                currentSearch={search}
                currentPage={ledgerResult.page}
                pageSize={ledgerResult.pageSize}
                totalPages={ledgerResult.totalPages}
                totalRows={ledgerResult.total}
            />
        </div>
    );
}
