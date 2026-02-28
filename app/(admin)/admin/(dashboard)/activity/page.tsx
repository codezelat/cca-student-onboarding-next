export default function ActivityPage() {
    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                    Activity Timeline
                </h1>
                <p className="text-gray-600">
                    Track all admin actions and system events
                </p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl p-12 text-center">
                <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
                <p className="text-gray-500 text-lg font-medium">
                    No activity recorded yet
                </p>
                <p className="text-gray-400 text-sm mt-1">
                    Activity logs will appear here once the database is
                    connected
                </p>
            </div>
        </>
    );
}
