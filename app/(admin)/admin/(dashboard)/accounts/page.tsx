import { getAdminUsers } from "./actions";
import AdminAccountsList from "./accounts-list";

export default async function AccountsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const page = Math.max(
        1,
        Number.isFinite(Number(params.page)) ? Number(params.page) : 1,
    );
    const usersResult = await getAdminUsers({ page, pageSize: 20 });

    return (
        <AdminAccountsList
            initialUsers={usersResult.data}
            currentPage={usersResult.page}
            pageSize={usersResult.pageSize}
            totalPages={usersResult.totalPages}
            totalRows={usersResult.total}
        />
    );
}
