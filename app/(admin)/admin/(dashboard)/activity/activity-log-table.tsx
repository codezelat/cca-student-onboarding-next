"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Search, X } from "lucide-react";
import { formatAppDateTime } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaginationRange } from "@/lib/pagination";
import { getActivityLogsForExport } from "./activity-actions";

type ActivityLogEntry = {
  id: string;
  createdAt: string;
  category: string;
  action: string;
  status: string;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  message: string | null;
  routeName: string | null;
  httpMethod: string | null;
  requestId: string | null;
  ipAddress: string | null;
  beforeData: unknown;
  afterData: unknown;
  meta: unknown;
};

type FilterOptions = {
  categories: string[];
  actions: string[];
  statuses: string[];
  subjectTypes: string[];
};

function toPrettyJson(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusClass(status: string): string {
  const lowered = status.toLowerCase();
  if (["success", "succeeded"].includes(lowered)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (["blocked", "warning"].includes(lowered)) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-rose-100 text-rose-700 border-rose-200";
}

export default function ActivityLogTable({
  initialLogs,
  totalRows,
  currentPage,
  pageSize,
  totalPages,
  currentSearch,
  currentActor,
  currentCategory,
  currentAction,
  currentStatus,
  currentSubjectType,
  currentDateFrom,
  currentDateTo,
  filterOptions,
}: {
  initialLogs: ActivityLogEntry[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  currentSearch: string;
  currentActor: string;
  currentCategory: string;
  currentAction: string;
  currentStatus: string;
  currentSubjectType: string;
  currentDateFrom: string;
  currentDateTo: string;
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const { start: paginationStart, end: paginationEnd } = getPaginationRange({
    currentPage,
    pageSize,
    totalRows,
  });
  const hasFilters = Boolean(
    currentSearch ||
      currentActor ||
      currentCategory ||
      currentAction ||
      currentStatus ||
      currentSubjectType ||
      currentDateFrom ||
      currentDateTo,
  );

  function buildUrl(params: {
    search?: string;
    actor?: string;
    category?: string;
    action?: string;
    status?: string;
    subjectType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    const next = {
      search: params.search ?? currentSearch,
      actor: params.actor ?? currentActor,
      category: params.category ?? currentCategory,
      action: params.action ?? currentAction,
      status: params.status ?? currentStatus,
      subjectType: params.subjectType ?? currentSubjectType,
      dateFrom: params.dateFrom ?? currentDateFrom,
      dateTo: params.dateTo ?? currentDateTo,
      page: params.page ?? currentPage,
    };

    const qs = new URLSearchParams();
    if (next.search) qs.set("search", next.search);
    if (next.actor) qs.set("actor", next.actor);
    if (next.category && next.category !== "all") qs.set("category", next.category);
    if (next.action && next.action !== "all") qs.set("action", next.action);
    if (next.status && next.status !== "all") qs.set("status", next.status);
    if (next.subjectType && next.subjectType !== "all") {
      qs.set("subject_type", next.subjectType);
    }
    if (next.dateFrom) qs.set("date_from", next.dateFrom);
    if (next.dateTo) qs.set("date_to", next.dateTo);
    if (next.page > 1) qs.set("page", String(next.page));

    const query = qs.toString();
    return query ? `/admin/activity?${query}` : "/admin/activity";
  }

  function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);

    const search = String(formData.get("search") || "");
    const actor = String(formData.get("actor") || "");
    const category = String(formData.get("category") || "");
    const action = String(formData.get("action") || "");
    const status = String(formData.get("status") || "");
    const subjectType = String(formData.get("subjectType") || "");
    const dateFrom = String(formData.get("dateFrom") || "");
    const dateTo = String(formData.get("dateTo") || "");

    router.push(
      buildUrl({
        search,
        actor,
        category,
        action,
        status,
        subjectType,
        dateFrom,
        dateTo,
        page: 1,
      }),
    );
  }

  function handleClear() {
    router.push("/admin/activity");
  }

  async function handleExportCsv() {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const exportRows = await getActivityLogsForExport({
        search: currentSearch,
        actor: currentActor,
        category: currentCategory,
        action: currentAction,
        status: currentStatus,
        subjectType: currentSubjectType,
        dateFrom: currentDateFrom,
        dateTo: currentDateTo,
      });
      if (exportRows.length === 0) return;

      const headers = [
        "Timestamp",
        "Status",
        "Category",
        "Action",
        "Actor Name",
        "Actor Email",
        "Subject Type",
        "Subject ID",
        "Subject Label",
        "Route",
        "Method",
        "Message",
        "Request ID",
        "IP Address",
      ];

      const rows = exportRows.map((row) => [
        formatAppDateTime(row.createdAt),
        row.status,
        row.category,
        row.action,
        row.actorNameSnapshot || "",
        row.actorEmailSnapshot || "",
        row.subjectType || "",
        row.subjectId || "",
        row.subjectLabel || "",
        row.routeName || "",
        row.httpMethod || "",
        (row.message || "").replaceAll('"', '""'),
        row.requestId || "",
        row.ipAddress || "",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.setAttribute("href", url);
      anchor.setAttribute(
        "download",
        `activity_log_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      anchor.style.visibility = "hidden";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export activity logs CSV:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg ring-1 ring-black/5">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  name="search"
                  defaultValue={currentSearch}
                  placeholder="Action, message, route, request ID..."
                  className="pl-10 bg-white/50 border-white/70 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Actor
              </label>
              <Input
                name="actor"
                defaultValue={currentActor}
                placeholder="Name or email"
                className="bg-white/50 border-white/70 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                name="status"
                defaultValue={currentStatus}
                className="w-full h-10 px-3 bg-white/50 border border-white/70 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/60"
              >
                <option value="">All statuses</option>
                {filterOptions.statuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                name="category"
                defaultValue={currentCategory}
                className="w-full h-10 px-3 bg-white/50 border border-white/70 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/60"
              >
                <option value="">All categories</option>
                {filterOptions.categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Action
              </label>
              <select
                name="action"
                defaultValue={currentAction}
                className="w-full h-10 px-3 bg-white/50 border border-white/70 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/60"
              >
                <option value="">All actions</option>
                {filterOptions.actions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Subject Type
              </label>
              <select
                name="subjectType"
                defaultValue={currentSubjectType}
                className="w-full h-10 px-3 bg-white/50 border border-white/70 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/60"
              >
                <option value="">All subjects</option>
                {filterOptions.subjectTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Date From
              </label>
              <Input
                name="dateFrom"
                type="date"
                defaultValue={currentDateFrom}
                className="bg-white/50 border-white/70 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Date To
              </label>
              <Input
                name="dateTo"
                type="date"
                defaultValue={currentDateTo}
                className="bg-white/50 border-white/70 rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="submit"
              className="rounded-xl px-6 bg-linear-to-r from-primary to-indigo-600 text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="rounded-xl border-white/70 bg-white/40"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="rounded-xl border-white/70 bg-white/40"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/50 border-b border-white/70">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {initialLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    No activity logs match the current filters.
                  </td>
                </tr>
              ) : (
                initialLogs.map((row) => (
                  <tr key={row.id} className="border-b border-white/40 align-top">
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                      {formatAppDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-4 min-w-72">
                      <p className="text-sm font-bold text-gray-900">{row.action}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                        {row.category}
                        {row.routeName ? ` • ${row.routeName}` : ""}
                        {row.httpMethod ? ` • ${row.httpMethod}` : ""}
                      </p>
                      {row.message ? (
                        <p className="text-xs text-gray-600 mt-2">{row.message}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 min-w-52">
                      <p className="text-sm font-semibold text-gray-900">
                        {row.actorNameSnapshot || "System"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {row.actorEmailSnapshot || "n/a"}
                      </p>
                    </td>
                    <td className="px-4 py-4 min-w-52">
                      <p className="text-sm font-semibold text-gray-900">
                        {row.subjectLabel || "n/a"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                        {[row.subjectType, row.subjectId].filter(Boolean).join(" • ") || "n/a"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusClass(
                          row.status || "unknown",
                        )}`}
                      >
                        {row.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-4 min-w-72">
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-semibold text-primary hover:text-primary/80">
                          View payload
                        </summary>
                        <div className="mt-2 space-y-2">
                          {row.requestId ? (
                            <p className="text-[11px] text-gray-500">
                              Request ID: <code>{row.requestId}</code>
                            </p>
                          ) : null}
                          {row.ipAddress ? (
                            <p className="text-[11px] text-gray-500">
                              IP: <code>{row.ipAddress}</code>
                            </p>
                          ) : null}
                          {row.beforeData ? (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                                Before
                              </p>
                              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] overflow-auto max-h-48">
                                {toPrettyJson(row.beforeData)}
                              </pre>
                            </div>
                          ) : null}
                          {row.afterData ? (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                                After
                              </p>
                              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] overflow-auto max-h-48">
                                {toPrettyJson(row.afterData)}
                              </pre>
                            </div>
                          ) : null}
                          {row.meta ? (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                                Meta
                              </p>
                              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] overflow-auto max-h-48">
                                {toPrettyJson(row.meta)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white/40 border-t border-white/60">
            <span className="text-sm text-gray-600">
              Showing {paginationStart}-{paginationEnd} of {totalRows} logs
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => router.push(buildUrl({ page: currentPage - 1 }))}
                className="rounded-lg"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => router.push(buildUrl({ page: currentPage + 1 }))}
                className="rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
