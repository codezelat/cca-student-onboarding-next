import { Activity, AlertTriangle, Clock, UserRound } from "lucide-react";
import { getActivityLogs } from "./activity-actions";
import ActivityLogTable from "./activity-log-table";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = (params.search as string) || "";
  const actor = (params.actor as string) || "";
  const category = (params.category as string) || "";
  const action = (params.action as string) || "";
  const status = (params.status as string) || "";
  const subjectType = (params.subject_type as string) || "";
  const dateFrom = (params.date_from as string) || "";
  const dateTo = (params.date_to as string) || "";
  const page = Math.max(
    1,
    Number.isFinite(Number(params.page)) ? Number(params.page) : 1,
  );

  const activityResult = await getActivityLogs({
    search,
    actor,
    category,
    action,
    status,
    subjectType,
    dateFrom,
    dateTo,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-slate-700 via-slate-800 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8 text-slate-700" />
          Activity Timeline
        </h1>
        <p className="text-gray-600">
          Centralized audit trail for admin actions, security checks, and public
          workflow events.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
            Total Logs
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {activityResult.stats.totalLogs}
          </p>
        </div>
        <div className="p-5 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Failures / Blocked
            </p>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-rose-700 mt-1">
            {activityResult.stats.failureLogs}
          </p>
        </div>
        <div className="p-5 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Last 24 Hours
            </p>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-indigo-700 mt-1">
            {activityResult.stats.last24hLogs}
          </p>
        </div>
        <div className="p-5 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Unique Actors
            </p>
            <UserRound className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-1">
            {activityResult.stats.uniqueActors}
          </p>
        </div>
      </div>

      <ActivityLogTable
        initialLogs={activityResult.data}
        totalRows={activityResult.total}
        currentPage={activityResult.page}
        pageSize={activityResult.pageSize}
        totalPages={activityResult.totalPages}
        currentSearch={search}
        currentActor={actor}
        currentCategory={category}
        currentAction={action}
        currentStatus={status}
        currentSubjectType={subjectType}
        currentDateFrom={dateFrom}
        currentDateTo={dateTo}
        filterOptions={activityResult.filters}
      />
    </div>
  );
}
