import { getAdminUsers } from "./actions";
import AdminAccountsList from "./accounts-list";

export default async function AccountsPage() {
    const users = await getAdminUsers();

    return <AdminAccountsList initialUsers={users} />;
}
