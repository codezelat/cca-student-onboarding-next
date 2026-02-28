import ReceivedPaymentsTable from "./received-payments-table";
import { getPendingPayments } from "./received-payments-actions";

export default async function ReceivedPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = (params.search as string) || "";
  const status = (params.status as string) || "pending";
  const page = Math.max(
    1,
    Number.isFinite(Number(params.page)) ? Number(params.page) : 1,
  );

  const [paymentsResult, pendingOnlyCountResult] = await Promise.all([
    getPendingPayments({
      search,
      status,
      page,
    }),
    getPendingPayments({
      status: "pending",
      page: 1,
      pageSize: 1,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
            Received Payments
          </h1>
          <p className="text-gray-600">
            Review and verify payment slips submitted via{" "}
            <strong>/cca/payment</strong> update portal (excludes initial
            registration payments).
          </p>
        </div>

        {/* Stats Summary Bubble */}
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pending Slips
              </p>
              <p className="text-xl font-black text-gray-800">
                {pendingOnlyCountResult.total}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ReceivedPaymentsTable
        initialPayments={paymentsResult.data}
        currentSearch={search}
        currentStatus={status}
        currentPage={paymentsResult.page}
        pageSize={paymentsResult.pageSize}
        totalPages={paymentsResult.totalPages}
        totalRows={paymentsResult.total}
      />
    </div>
  );
}
