"use client";

export function Footer() {
    return (
        <footer className="relative z-10 px-6 lg:px-8 py-12 border-t border-white/20">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/images/icon.png"
                            alt="Codezela"
                            className="w-8 h-8"
                        />
                        <div>
                            <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent block">
                                Codezela Career Accelerator
                            </span>
                            <span className="text-xs text-gray-600">
                                Powered by{" "}
                                <a
                                    href="https://codezela.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary-600 transition-colors font-medium"
                                >
                                    Codezela Technologies
                                </a>
                            </span>
                        </div>
                    </div>

                    <div className="text-center md:text-right text-sm text-gray-600">
                        <p>
                            &copy; {new Date().getFullYear()} Codezela Career
                            Accelerator. All rights reserved.
                        </p>
                        <p className="mt-1">
                            Built with ❤️ for aspiring professionals
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
