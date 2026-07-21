"use client";

import { useState, useTransition } from "react";
import { Edit3, Layers3, Loader2, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminBusyRouter } from "@/components/admin/admin-activity-provider";
import { useToast } from "@/hooks/use-toast";
import { getPaginationDisplay, getPaginationRange } from "@/lib/pagination";
import {
  deleteProgramModule,
  upsertProgramModule,
  type ProgramModuleItem,
} from "../../programs-actions";

export default function ProgramModulesClient({
  programId,
  initialModules,
  currentPage,
  pageSize,
  totalPages,
  totalRows,
}: {
  programId: string;
  initialModules: ProgramModuleItem[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}) {
  const router = useAdminBusyRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProgramModuleItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ProgramModuleItem | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creditValue, setCreditValue] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const { start, end } = getPaginationRange({ currentPage, pageSize, totalRows });
  const paginationItems = getPaginationDisplay({ currentPage, totalPages });

  function buildUrl(page: number) {
    return page > 1 ? `/admin/programs/${programId}/modules?page=${page}` : `/admin/programs/${programId}/modules`;
  }

  function openCreate() {
    setCode("");
    setName("");
    setCreditValue("");
    setDisplayOrder(String(totalRows));
    setIsActive(true);
    setEditing(null);
  }

  function openEdit(module: ProgramModuleItem) {
    setCode(module.code);
    setName(module.name);
    setCreditValue(module.creditValue ?? "");
    setDisplayOrder(String(module.displayOrder));
    setIsActive(module.isActive);
    setEditing(module);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim();
    const parsedCredits = creditValue.trim() ? Number(creditValue) : null;
    const parsedDisplayOrder = Number(displayOrder);

    if (
      normalizedCode.length < 2 ||
      normalizedName.length < 2 ||
      (parsedCredits !== null &&
        (!Number.isFinite(parsedCredits) || parsedCredits < 0 || parsedCredits > 999.99)) ||
      !Number.isInteger(parsedDisplayOrder) ||
      parsedDisplayOrder < 0 ||
      parsedDisplayOrder > 10000
    ) {
      toast({
        title: "Check module details",
        description: "Use a code, name, valid credits, and an order from 0 to 10,000.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        await upsertProgramModule({
          id: editing?.id,
          programId,
          code: normalizedCode,
          name: normalizedName,
          creditValue: parsedCredits,
          displayOrder: parsedDisplayOrder,
          isActive,
        });
        toast({ title: editing ? "Module updated" : "Module added" });
        setEditing(undefined);
        router.refresh();
      } catch (error) {
        toast({ title: "Could not save module", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteProgramModule(deleteTarget.id, programId);
        toast({ title: "Module deleted" });
        setDeleteTarget(null);
        router.refresh();
      } catch (error) {
        toast({ title: "Could not delete module", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={openCreate} className="rounded-xl bg-primary shadow-lg"><Plus data-icon="inline-start" />Add Module</Button></div>
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/65 shadow-xl shadow-gray-200/40 backdrop-blur-md">
        <Table>
          <TableHeader className="bg-white/45"><TableRow><TableHead className="px-5">Code</TableHead><TableHead>Module</TableHead><TableHead>Credits</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="px-5 text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {initialModules.map((module) => (
              <TableRow key={module.id} className="border-gray-100/80">
                <TableCell className="px-5 font-mono text-xs font-bold text-primary-700">{module.code}</TableCell>
                <TableCell className="font-semibold text-gray-900">{module.name}</TableCell>
                <TableCell>{module.creditValue ?? "—"}</TableCell>
                <TableCell>{module.displayOrder}</TableCell>
                <TableCell><span className={module.isActive ? "text-emerald-700" : "text-gray-500"}>{module.isActive ? "Active" : "Inactive"}</span></TableCell>
                <TableCell className="px-5"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => openEdit(module)} aria-label={`Edit ${module.code}`}><Edit3 /></Button><Button variant="ghost" size="icon-sm" className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteTarget(module)} aria-label={`Delete ${module.code}`}><Trash2 /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {initialModules.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><Layers3 className="size-6" /></div><p className="font-semibold text-gray-700">No modules yet</p><Button variant="outline" className="rounded-xl" onClick={openCreate}><Plus data-icon="inline-start" />Add Module</Button></div> : null}
        {totalPages > 1 ? <div className="flex flex-col gap-4 border-t border-gray-100 bg-white/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><span className="text-sm text-gray-600">Showing {start}-{end} of {totalRows} modules</span><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => router.push(buildUrl(1))}>First</Button><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => router.push(buildUrl(currentPage - 1))}>Previous</Button>{paginationItems.map((item) => item.type === "ellipsis" ? <span key={item.key} className="px-2 text-sm font-semibold text-gray-400">...</span> : <Button key={item.page} variant={item.page === currentPage ? "default" : "outline"} size="sm" disabled={item.page === currentPage} onClick={() => router.push(buildUrl(item.page))}>{item.page}</Button>)}<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl(currentPage + 1))}>Next</Button><Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => router.push(buildUrl(totalPages))}>Last</Button></div></div> : null}
      </div>
      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !isPending) setEditing(undefined); }}>
        <DialogContent className="rounded-3xl border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl sm:max-w-lg">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <DialogHeader><DialogTitle>{editing ? "Edit Module" : "Add Module"}</DialogTitle><DialogDescription className="sr-only">Set the module details for this program.</DialogDescription></DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="module-code">Code</Label><Input id="module-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="CCA-101" minLength={2} maxLength={80} required className="mt-2 rounded-xl" /></div><div><Label htmlFor="module-credits">Credits</Label><Input id="module-credits" type="number" min="0" max="999.99" step="0.01" value={creditValue} onChange={(event) => setCreditValue(event.target.value)} placeholder="Optional" className="mt-2 rounded-xl" /></div><div className="sm:col-span-2"><Label htmlFor="module-name">Module</Label><Input id="module-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Module name" minLength={2} maxLength={200} required className="mt-2 rounded-xl" /></div><div><Label htmlFor="module-order">Order</Label><Input id="module-order" type="number" min="0" max="10000" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} required className="mt-2 rounded-xl" /></div><div className="flex items-end pb-2"><div className="flex items-center gap-2"><Checkbox id="module-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} /><Label htmlFor="module-active" className="cursor-pointer">Active</Label></div></div></div>
            <DialogFooter><Button type="button" variant="ghost" className="rounded-xl" disabled={isPending} onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" className="rounded-xl bg-primary" disabled={isPending}>{isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}{editing ? "Save Changes" : "Add Module"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !isPending) setDeleteTarget(null); }} title="Delete Module" description={deleteTarget ? `Delete ${deleteTarget.code}?` : undefined} confirmLabel="Delete Module" variant="destructive" isPending={isPending} onConfirm={confirmDelete} />
    </div>
  );
}
