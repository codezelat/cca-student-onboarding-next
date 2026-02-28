"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { upsertProgram } from "../programs-actions";
import { useToast } from "@/hooks/use-toast";

const programSchema = z.object({
    code: z.string().min(2, "Program ID / Code is required (e.g. cca-A001)"),
    name: z.string().min(5, "Full program name is required"),
    yearLabel: z.string().min(2, "Year label is required (e.g. 2025)"),
    durationLabel: z
        .string()
        .min(2, "Duration label is required (e.g. 6 Months)"),
    basePrice: z.coerce.number().default(0),
    currency: z.string().default("LKR"),
    isActive: z.boolean().default(true),
});

interface ProgramFormProps {
    program?: any; // If editing
}

export default function ProgramForm({ program }: ProgramFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof programSchema>>({
        resolver: zodResolver(programSchema) as any,
        defaultValues: program
            ? {
                  code: program.code,
                  name: program.name,
                  yearLabel: program.yearLabel,
                  durationLabel: program.durationLabel,
                  basePrice: Number(program.basePrice),
                  currency: program.currency || "LKR",
                  isActive: program.isActive,
              }
            : {
                  code: "",
                  name: "",
                  yearLabel: new Date().toISOString().slice(0, 4),
                  durationLabel: "6 Months",
                  basePrice: 0,
                  currency: "LKR",
                  isActive: true,
              },
    });

    async function onSubmit(values: z.infer<typeof programSchema>) {
        setIsSaving(true);
        try {
            const result = await upsertProgram({
                id: program?.id,
                ...values,
            });

            toast({
                title: "Success",
                description: `Program ${program ? "updated" : "created"} successfully.`,
            });

            router.push("/admin/programs");
            router.refresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save program.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Programs
                </Button>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 shadow-lg px-8 rounded-xl"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {program ? "Save Changes" : "Create Program"}
                </Button>
            </div>

            <Card className="border-none shadow-2xl shadow-gray-200/50 bg-white/70 backdrop-blur-md overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-indigo-600"></div>
                <CardHeader className="pt-8 px-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">
                                {program
                                    ? "Edit Program Details"
                                    : "Register New Program"}
                            </CardTitle>
                            <CardDescription>
                                Fill in the course information, academic levels,
                                and delivery modes.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    Program Code (Unique ID)
                                </Label>
                                <Input
                                    id="code"
                                    className="rounded-xl bg-white/50 border-gray-200"
                                    placeholder="e.g. cca-A001"
                                    {...form.register("code")}
                                />
                                {form.formState.errors.code && (
                                    <p className="text-xs text-rose-500">
                                        {form.formState.errors.code.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="yearLabel">Program Year</Label>
                                <Input
                                    id="yearLabel"
                                    className="rounded-xl bg-white/50 border-gray-200"
                                    placeholder="e.g. 2025"
                                    {...form.register("yearLabel")}
                                />
                                {form.formState.errors.yearLabel && (
                                    <p className="text-xs text-rose-500">
                                        {
                                            form.formState.errors.yearLabel
                                                .message
                                        }
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="name">Full Program Name</Label>
                                <Input
                                    id="name"
                                    className="rounded-xl bg-white/50 border-gray-200"
                                    placeholder="e.g. Advanced Diploma in Computer Science"
                                    {...form.register("name")}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-xs text-rose-500">
                                        {form.formState.errors.name.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="durationLabel">Duration</Label>
                                <Input
                                    id="durationLabel"
                                    className="rounded-xl bg-white/50 border-gray-200"
                                    placeholder="e.g. 6 Months"
                                    {...form.register("durationLabel")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="basePrice">
                                    Base Price (LKR)
                                </Label>
                                <Input
                                    id="basePrice"
                                    type="number"
                                    className="rounded-xl bg-white/50 border-gray-200"
                                    {...form.register("basePrice")}
                                />
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pb-20">
                <Button
                    variant="outline"
                    className="rounded-xl px-8"
                    onClick={() => router.back()}
                >
                    Cancel
                </Button>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 shadow-lg px-8 rounded-xl"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {program ? "Save Changes" : "Create Program"}
                </Button>
            </div>
        </div>
    );
}
