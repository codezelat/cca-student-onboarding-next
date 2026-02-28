import { getAllPrograms } from "./programs-actions";
import ProgramsListClient from "./programs-list-client";
import { Plus, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProgramsPage({
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
    const programsResult = await getAllPrograms({ search, page, pageSize: 20 });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-primary-600" />
                        Program Management
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Configure courses, intake windows, and pricing
                        overrides.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        asChild
                        className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all rounded-xl px-6"
                    >
                        <Link prefetch={false} href="/admin/programs/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Program
                        </Link>
                    </Button>
                </div>
            </div>

            <ProgramsListClient
                initialPrograms={programsResult.data}
                currentSearch={search}
                currentPage={programsResult.page}
                totalPages={programsResult.totalPages}
                totalRows={programsResult.total}
            />
        </div>
    );
}
