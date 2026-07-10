import { notFound } from "next/navigation";
import { ArrowLeft, Layers3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getProgramById, getProgramModules } from "../../programs-actions";
import ProgramModulesClient from "./program-modules-client";

export default async function ProgramModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
  const [program, modules] = await Promise.all([
    getProgramById(id),
    getProgramModules(id, { page, pageSize: 20 }),
  ]);

  if (!program) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 rounded-xl">
          <Link prefetch={false} href="/admin/programs"><ArrowLeft data-icon="inline-start" />All Programs</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Layers3 className="size-8" /></div>
          <div>
            <h1 className="bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-3xl font-bold text-transparent">Program Modules</h1>
            <p className="text-sm text-gray-600">{program.name} · {program.programId}</p>
          </div>
        </div>
      </div>
      <ProgramModulesClient
        programId={id}
        initialModules={modules.data}
        currentPage={modules.page}
        pageSize={modules.pageSize}
        totalPages={modules.totalPages}
        totalRows={modules.total}
      />
    </div>
  );
}
