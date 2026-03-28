"use client";

import { useEffect, useState } from "react";
import {
  Edit,
  Trash2,
  Calendar,
  Users,
  BadgeCheck,
  BadgeX,
  MoreVertical,
  Clock,
  Search,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toggleProgramStatus, deleteProgram } from "./programs-actions";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAdminBusyRouter } from "@/components/admin/admin-activity-provider";
import { formatAppDate } from "@/lib/formatters";
import { getPaginationRange } from "@/lib/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProgramCardItem,
  ProgramRegistrationsSort,
  ProgramStatusSort,
} from "./programs-types";

interface ProgramsListClientProps {
  initialPrograms: ProgramCardItem[];
  currentSearch: string;
  currentStatusSort: ProgramStatusSort;
  currentRegistrationsSort: ProgramRegistrationsSort;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}

function parseStatusSort(value: string): ProgramStatusSort {
  if (value === "active_first" || value === "inactive_first") {
    return value;
  }

  return "none";
}

function parseRegistrationsSort(value: string): ProgramRegistrationsSort {
  if (value === "most" || value === "fewest") {
    return value;
  }

  return "none";
}

export default function ProgramsListClient({
  initialPrograms,
  currentSearch,
  currentStatusSort,
  currentRegistrationsSort,
  currentPage,
  pageSize,
  totalPages,
  totalRows,
}: ProgramsListClientProps) {
  const router = useAdminBusyRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [statusSortValue, setStatusSortValue] =
    useState<ProgramStatusSort>(currentStatusSort);
  const [registrationsSortValue, setRegistrationsSortValue] =
    useState<ProgramRegistrationsSort>(currentRegistrationsSort);
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { start: paginationStart, end: paginationEnd } = getPaginationRange({
    currentPage,
    pageSize,
    totalRows,
  });

  useEffect(() => {
    setPrograms(initialPrograms);
  }, [initialPrograms]);

  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setStatusSortValue(currentStatusSort);
  }, [currentStatusSort]);

  useEffect(() => {
    setRegistrationsSortValue(currentRegistrationsSort);
  }, [currentRegistrationsSort]);

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    try {
      // Optimistic update
      setPrograms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p)),
      );
      await toggleProgramStatus(id, currentStatus);
      toast({
        title: "Status Updated",
        description: `Program is now ${!currentStatus ? "Active" : "Inactive"}.`,
      });
      router.refresh();
    } catch {
      // Revert on error
      setPrograms(initialPrograms);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    setDeleteConfirm({ id });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteProgram(deleteConfirm.id);
      setPrograms((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast({
        title: "Deleted",
        description: "Program removed successfully.",
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Cannot Delete",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete program.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function buildUrl(params: {
    search?: string;
    statusSort?: ProgramStatusSort;
    registrationsSort?: ProgramRegistrationsSort;
    page?: number;
  }) {
    const sp = new URLSearchParams();
    const nextSearch = params.search ?? currentSearch;
    const nextStatusSort = params.statusSort ?? currentStatusSort;
    const nextRegistrationsSort =
      params.registrationsSort ?? currentRegistrationsSort;
    const nextPage = params.page ?? currentPage;

    if (nextSearch) sp.set("search", nextSearch);
    if (nextStatusSort && nextStatusSort !== "none") {
      sp.set("status_sort", nextStatusSort);
    }
    if (nextRegistrationsSort && nextRegistrationsSort !== "none") {
      sp.set("registrations_sort", nextRegistrationsSort);
    }
    if (nextPage > 1) sp.set("page", String(nextPage));

    const query = sp.toString();
    return query ? `/admin/programs?${query}` : "/admin/programs";
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      buildUrl({
        search: searchQuery,
        statusSort: statusSortValue,
        registrationsSort: registrationsSortValue,
        page: 1,
      }),
    );
  };

  const hasFilters = Boolean(
    currentSearch ||
      searchQuery ||
      currentStatusSort !== "none" ||
      currentRegistrationsSort !== "none",
  );

  const handleClearFilter = () => {
    setSearchQuery("");
    setStatusSortValue("none");
    setRegistrationsSortValue("none");
    router.push("/admin/programs");
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search programs by name or code..."
              className="pl-10 bg-white/50 backdrop-blur-sm border-white/60 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="rounded-xl">
            Search
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={handleClearFilter}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="grid w-full gap-3 lg:w-auto lg:grid-cols-2">
          <Select
            value={registrationsSortValue}
            onValueChange={(value) => {
              const nextValue = parseRegistrationsSort(value);
              setRegistrationsSortValue(nextValue);
              router.push(
                buildUrl({
                  search: searchQuery,
                  statusSort: statusSortValue,
                  registrationsSort: nextValue,
                  page: 1,
                }),
              );
            }}
          >
            <SelectTrigger className="w-full min-w-56 rounded-xl border-white/60 bg-white/50 backdrop-blur-sm">
              <SelectValue placeholder="Sort by registrations" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/70 bg-white/95">
              <SelectItem value="none">Registrations: Default</SelectItem>
              <SelectItem value="most">Most Registrations</SelectItem>
              <SelectItem value="fewest">Fewest Registrations</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusSortValue}
            onValueChange={(value) => {
              const nextValue = parseStatusSort(value);
              setStatusSortValue(nextValue);
              router.push(
                buildUrl({
                  search: searchQuery,
                  statusSort: nextValue,
                  registrationsSort: registrationsSortValue,
                  page: 1,
                }),
              );
            }}
          >
            <SelectTrigger className="w-full min-w-48 rounded-xl border-white/60 bg-white/50 backdrop-blur-sm">
              <SelectValue placeholder="Sort by status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/70 bg-white/95">
              <SelectItem value="none">Status: Default</SelectItem>
              <SelectItem value="active_first">Active First</SelectItem>
              <SelectItem value="inactive_first">Inactive First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {programs.map((program) => (
            <motion.div
              key={program.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Card className="group relative flex h-full flex-col overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-xl shadow-gray-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-100/30">
                <div
                  className={`pointer-events-none absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 transition-colors duration-500 ${program.isActive ? "bg-emerald-400" : "bg-rose-400"}`}
                ></div>

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-primary-600 border-primary-200 uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 mb-2"
                      >
                        {program.programId || (
                          <span className="text-gray-400 italic">No Code</span>
                        )}
                      </Badge>
                      <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {program.name}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-white/80"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 p-1 rounded-xl shadow-2xl border-white/60 bg-white/90 backdrop-blur-xl"
                        >
                          <DropdownMenuItem asChild className="rounded-lg">
                            <Link prefetch={false} href={`/admin/programs/${program.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Program
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="rounded-lg">
                            <Link prefetch={false} href={`/admin/programs/${program.id}/intakes`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Manage Intakes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={`rounded-lg font-medium ${program.isActive ? "text-rose-600" : "text-emerald-600"}`}
                            onClick={() =>
                              handleToggleStatus(program.id, program.isActive)
                            }
                          >
                            {program.isActive ? (
                              <>
                                <BadgeX className="w-4 h-4 mr-2" /> Deactivate
                              </>
                            ) : (
                              <>
                                <BadgeCheck className="w-4 h-4 mr-2" /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                            onClick={() => handleDelete(program.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Program
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Badge
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          program.isActive
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-rose-100 text-rose-700 border-rose-200"
                        }`}
                      >
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/50 rounded-xl border border-white/60">
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-primary" />
                        Students
                      </p>
                      <p className="text-xl font-black text-gray-800">
                        {program._count.registrations}
                      </p>
                    </div>
                    <div className="p-3 bg-white/50 rounded-xl border border-white/60">
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        Intakes
                      </p>
                      <p className="text-xl font-black text-gray-800">
                        {program._count.intakeWindows}
                      </p>
                    </div>
                  </div>

                  <div className="min-h-24">
                    {program.intakeWindows && program.intakeWindows.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-gray-400">
                        Active Intake
                      </p>
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <p className="text-sm font-bold text-indigo-900 group-hover:text-primary transition-colors">
                          {program.intakeWindows[0].windowName}
                        </p>
                        <p className="text-[10px] text-indigo-600/80 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Closing:{" "}
                          {formatAppDate(program.intakeWindows[0].closesAt)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center py-2">
                      <p className="text-xs text-gray-400 italic">
                        No active intake windows
                      </p>
                    </div>
                  )}
                  </div>
                </CardContent>

                <CardFooter className="pt-2 mt-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-white/40 hover:bg-primary hover:text-white border-white/60 rounded-xl transition-all font-bold"
                  >
                    <Link prefetch={false} href={`/admin/programs/${program.id}/intakes`}>
                      Manage Windows
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {programs.length === 0 && (
        <div className="text-center py-20 px-4 bg-white/30 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600">No programs found</h3>
          <p className="text-gray-400">
            Try adjusting your search term or create a new program.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/60 bg-white/40">
          <span className="text-sm text-gray-600">
            Showing {paginationStart}-{paginationEnd} of {totalRows} programs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => router.push(buildUrl({ page: currentPage - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(buildUrl({ page: currentPage + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title="Delete Program"
        description="Are you sure you want to delete this program? This cannot be undone if it has no registrations."
        confirmLabel="Delete Program"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
