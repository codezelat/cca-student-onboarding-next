"use client";

import { useEffect, useState } from "react";
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Clock,
    CalendarCheck,
    DollarSign,
    MoreVertical,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    upsertIntakeWindow,
    toggleIntakeStatus,
    deleteIntakeWindow,
} from "../../programs-actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
    formatAppDate,
    formatAppNumber,
    toDateInputValue,
} from "@/lib/formatters";

interface IntakesClientProps {
    programId: string;
    initialIntakes: any[];
    currentPage: number;
    totalPages: number;
    totalRows: number;
}

export default function IntakesClient({
    programId,
    initialIntakes,
    currentPage,
    totalPages,
    totalRows,
}: IntakesClientProps) {
    const router = useRouter();
    const [intakes, setIntakes] = useState(initialIntakes);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIntake, setEditingIntake] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIntakes(initialIntakes);
    }, [initialIntakes]);

    async function handleSave(formData: FormData) {
        setIsSaving(true);
        try {
            const data = {
                id: editingIntake?.id,
                programId,
                windowName: formData.get("windowName"),
                opensAt: formData.get("opensAt"),
                closesAt: formData.get("closesAt"),
                priceOverride: formData.get("priceOverride") || null,
                isActive: formData.get("isActive") === "on",
            };

            const result = await upsertIntakeWindow(data);

            if (editingIntake) {
                setIntakes((prev) =>
                    prev.map((i) => (i.id === result.id ? result : i)),
                );
            } else {
                setIntakes((prev) => [result, ...prev]);
            }

            toast({ title: "Success", description: "Intake window saved." });
            setIsDialogOpen(false);
            setEditingIntake(null);
            router.refresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save intake window.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleToggle(id: string, currentStatus: boolean) {
        try {
            await toggleIntakeStatus(id, programId, currentStatus);
            setIntakes((prev) =>
                prev.map((i) =>
                    i.id === id ? { ...i, isActive: !currentStatus } : i,
                ),
            );
            toast({ title: "Status Updated" });
            router.refresh();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        }
    }

    async function handleDelete(id: string) {
        if (
            !confirm(
                "Are you sure? This will permanently remove this intake window.",
            )
        )
            return;
        try {
            await deleteIntakeWindow(id, programId);
            setIntakes((prev) => prev.filter((i) => i.id !== id));
            toast({ title: "Deleted" });
            router.refresh();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        }
    }

    const openForEdit = (intake: any) => {
        setEditingIntake(intake);
        setIsDialogOpen(true);
    };

    const openForCreate = () => {
        setEditingIntake(null);
        setIsDialogOpen(true);
    };

    function buildUrl(page: number) {
        return page > 1
            ? `/admin/programs/${programId}/intakes?page=${page}`
            : `/admin/programs/${programId}/intakes`;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <AlertCircle className="w-4 h-4" />
                    Students can only register for active windows within their
                    date ranges.
                </div>
                <Button
                    onClick={openForCreate}
                    className="bg-primary hover:bg-primary/90 rounded-xl shadow-lg"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Intake
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {intakes.map((intake) => (
                        <motion.div
                            key={intake.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <Card className="border-none shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-md overflow-hidden group">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                        <div
                                            className={`w-1.5 self-stretch rounded-full ${intake.isActive ? "bg-emerald-500" : "bg-gray-300"}`}
                                        ></div>

                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {intake.windowName}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        intake.isActive
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className={
                                                        intake.isActive
                                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                                            : ""
                                                    }
                                                >
                                                    {intake.isActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-primary" />
                                                    Opens:{" "}
                                                    <span className="font-semibold text-gray-700">
                                                        {formatAppDate(
                                                            intake.opensAt,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-orange-500" />
                                                    Closes:{" "}
                                                    <span className="font-semibold text-gray-700">
                                                        {formatAppDate(
                                                            intake.closesAt,
                                                        )}
                                                    </span>
                                                </div>
                                                {intake.priceOverride && (
                                                    <div className="flex items-center gap-1.5">
                                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                                        Override:{" "}
                                                        <span className="font-bold text-emerald-700">
                                                            Rs.{" "}
                                                            {formatAppNumber(
                                                                parseFloat(
                                                                    intake.priceOverride,
                                                                ),
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleToggle(
                                                        intake.id,
                                                        intake.isActive,
                                                    )
                                                }
                                                className="rounded-xl text-gray-600"
                                            >
                                                {intake.isActive ? (
                                                    <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                ) : (
                                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                )}
                                                <span className="sr-only">
                                                    Toggle Status
                                                </span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    openForEdit(intake)
                                                }
                                                className="rounded-xl border-gray-200"
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(intake.id)
                                                }
                                                className="rounded-xl border-gray-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {intakes.length === 0 && (
                    <div className="text-center py-16 bg-white/20 rounded-3xl border-2 border-dashed border-gray-300">
                        <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-500">
                            No Admission Intakes Yet
                        </h3>
                        <p className="text-gray-400">
                            Create your first intake window to start accepting
                            registrations.
                        </p>
                        <Button
                            onClick={openForCreate}
                            variant="outline"
                            className="mt-4 rounded-xl border-primary text-primary hover:bg-primary/5"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Intake
                        </Button>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/60 bg-white/40">
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages} ({intakes.length} /{" "}
                            {totalRows} intake windows)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    router.push(buildUrl(currentPage - 1))
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() =>
                                    router.push(buildUrl(currentPage + 1))
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-125 rounded-3xl bg-white/90 backdrop-blur-xl border-white/60 shadow-2xl">
                    <form action={handleSave}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">
                                {editingIntake
                                    ? "Edit Intake Window"
                                    : "New Intake Window"}
                            </DialogTitle>
                            <DialogDescription>
                                Define the registration dates and optional
                                pricing for this program cycle.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="grid gap-2">
                                <Label htmlFor="windowName">
                                    Window Name (Display)
                                </Label>
                                <Input
                                    id="windowName"
                                    name="windowName"
                                    defaultValue={
                                        editingIntake?.windowName ||
                                        "Batch 1 - 2026"
                                    }
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="opensAt">
                                        Opening Date
                                    </Label>
                                    <Input
                                        id="opensAt"
                                        name="opensAt"
                                        type="date"
                                        defaultValue={
                                            editingIntake
                                                ? toDateInputValue(
                                                      editingIntake.opensAt,
                                                  )
                                                : ""
                                        }
                                        className="rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="closesAt">
                                        Closing Date
                                    </Label>
                                    <Input
                                        id="closesAt"
                                        name="closesAt"
                                        type="date"
                                        defaultValue={
                                            editingIntake
                                                ? toDateInputValue(
                                                      editingIntake.closesAt,
                                                  )
                                                : ""
                                        }
                                        className="rounded-xl"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="priceOverride">
                                    Price Override (Optional)
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        Rs.
                                    </span>
                                    <Input
                                        id="priceOverride"
                                        name="priceOverride"
                                        type="number"
                                        defaultValue={
                                            editingIntake?.priceOverride || ""
                                        }
                                        placeholder="Leave empty for default"
                                        className="pl-12 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                <Checkbox
                                    id="isActive"
                                    name="isActive"
                                    defaultChecked={
                                        editingIntake
                                            ? editingIntake.isActive
                                            : true
                                    }
                                />
                                <Label
                                    htmlFor="isActive"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Active (Visible on public registration form)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsDialogOpen(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary/90 px-8 rounded-xl"
                            >
                                {isSaving ? "Saving..." : "Save Window"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
