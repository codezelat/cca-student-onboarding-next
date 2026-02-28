import Link from "next/link";
import {
    getDashboardStats,
    getRegistrations,
    getActivePrograms,
} from "./dashboard-actions";
import RegistrationTable from "./registration-table";

export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const scope = (params.scope as string) || "active";
    const search = (params.search as string) || "";
    const programFilter = (params.program_filter as string) || "";
    const tagFilter = (params.tag_filter as string) || "";
    const page = Math.max(
        1,
        Number.isFinite(Number(params.page))
            ? Number(params.page)
            : 1,
    );

    const [stats, registrationsResult, programs] = await Promise.all([
        getDashboardStats(),
        getRegistrations({ scope, search, programFilter, tagFilter, page }),
        getActivePrograms(),
    ]);

    return (
        <>
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                        Student Registrations
                    </h1>
                    <p className="text-gray-600">
                        Manage and review all CCA program registrations
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        prefetch={false}
                        href="/admin/programs"
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13"
                            />
                        </svg>
                        <span>Programs</span>
                    </Link>
                    <Link
                        prefetch={false}
                        href="/admin/activity"
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-300 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                        <svg
                            className="w-5 h-5"
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
                        <span>Activity</span>
                    </Link>
                </div>
            </div>

            <RegistrationTable
                initialRegistrations={registrationsResult.data}
                initialStats={stats}
                programs={programs}
                currentScope={scope}
                currentSearch={search}
                currentProgram={programFilter}
                currentTag={tagFilter}
                currentPage={registrationsResult.page}
                totalPages={registrationsResult.totalPages}
                totalRows={registrationsResult.total}
            />
        </>
    );
}
