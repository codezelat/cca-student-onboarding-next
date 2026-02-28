import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const userName =
        user?.user_metadata?.name || user?.email?.split("@")[0] || "Admin";
    const userEmail = user?.email || "N/A";

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                    Profile Settings
                </h1>
                <p className="text-gray-600">
                    Manage your admin account settings
                </p>
            </div>

            <div className="max-w-2xl">
                {/* Profile Info Card */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden mb-6">
                    <div className="px-6 py-4 bg-gradient-to-r from-primary-500 to-secondary-500">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-white font-bold text-2xl">
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    {userName}
                                </h3>
                                <p className="text-sm text-white/80">
                                    {userEmail}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Display Name
                            </label>
                            <input
                                type="text"
                                defaultValue={userName}
                                className="w-full px-4 py-2.5 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                defaultValue={userEmail}
                                className="w-full px-4 py-2.5 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                disabled
                            />
                        </div>

                        <p className="text-xs text-gray-500">
                            Profile updates are managed through Supabase Auth.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
