import { notFound } from "next/navigation";
import { getProgramById, getProgramIntakes } from "../../programs-actions";
import IntakesClient from "./intakes-client";
import { CalendarDays, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function IntakesPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const query = await searchParams;
    const page = Math.max(
        1,
        Number.isFinite(Number(query.page)) ? Number(query.page) : 1,
    );

    const [program, intakesResult] = await Promise.all([
        getProgramById(id),
        getProgramIntakes(id, { page, pageSize: 20 }),
    ]);

    if (!program) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-xl -ml-2 mb-2"
                    >
                        <Link prefetch={false} href="/admin/programs">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            All Programs
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                            <CalendarDays className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                Intake Management
                            </h1>
                            <p className="text-gray-600 text-sm flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                Scheduling windows for{" "}
                                <span className="font-bold text-gray-900">
                                    {program.name}
                                </span>{" "}
                                ({program.programId})
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <IntakesClient
                programId={id}
                initialIntakes={intakesResult.data}
                currentPage={intakesResult.page}
                pageSize={intakesResult.pageSize}
                totalPages={intakesResult.totalPages}
                totalRows={intakesResult.total}
            />
        </div>
    );
}
