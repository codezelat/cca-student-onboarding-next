"use client";

import Link from "next/link";
import ThreejsBackground from "@/components/ui/ThreejsBackground";

export default function Home() {
    return (
        <div className="relative min-h-screen">
            {/* 3D Canvas Background */}
            <ThreejsBackground />

            {/* Main Content */}
            <div className="relative min-h-screen">
                {/* Hero Section */}
                <div className="relative z-10 px-6 lg:px-8 py-12 lg:py-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left Column - Content */}
                            <div className="space-y-8">
                                <div className="inline-block mb-4">
                                    <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-lg border border-white/80 shadow-xl hover:shadow-2xl hover:bg-white/70 transition-all duration-300 inline-block">
                                        <img
                                            src="/images/logo-wide.png"
                                            alt="Codezela Career Accelerator"
                                            className="h-12 md:h-16"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                                        <span className="bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-700 bg-clip-text text-transparent">
                                            Accelerate
                                        </span>
                                        <br />
                                        <span className="text-gray-800">
                                            Your Career
                                        </span>
                                    </h1>
                                    <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                                        Transform your future with
                                        industry-leading programs designed to
                                        fast-track your professional growth.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Link
                                        href="/register"
                                        className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 
                                              text-white font-semibold hover:from-primary-600 hover:to-secondary-600 
                                              transition-all duration-300 shadow-2xl hover:shadow-primary-500/50 
                                              hover:scale-105 inline-flex items-center gap-2"
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
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                        Register Now
                                        <svg
                                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                                            />
                                        </svg>
                                    </Link>

                                    <a
                                        href="#contact"
                                        className="px-8 py-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 
                                              text-primary-700 font-semibold hover:bg-white/60 transition-all duration-300 
                                              shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
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
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            />
                                        </svg>
                                        Contact Support
                                    </a>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-6 pt-8">
                                    <div className="text-center p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                        <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                            1000+
                                        </div>
                                        <div className="text-sm text-gray-700 mt-1 font-medium">
                                            Students Enrolled
                                        </div>
                                    </div>
                                    <div className="text-center p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                        <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                            100%
                                        </div>
                                        <div className="text-sm text-gray-700 mt-1 font-medium">
                                            Success Stories
                                        </div>
                                    </div>
                                    <div className="text-center p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                        <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                            24/7
                                        </div>
                                        <div className="text-sm text-gray-700 mt-1 font-medium">
                                            Support
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - 3D Feature Cards */}
                            <div className="relative hidden lg:block">
                                <div className="space-y-6">
                                    {/* Feature Card 1 */}
                                    <div
                                        className="group relative p-8 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/90 
                                                shadow-2xl hover:shadow-primary-500/40 transition-all duration-500 hover:scale-[1.03]
                                                hover:bg-white/85 transform hover:-rotate-1"
                                    >
                                        <div
                                            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 
                                                    opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        ></div>
                                        <div className="relative">
                                            <div
                                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 
                                                        flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 
                                                        group-hover:shadow-primary-500/50 transition-all duration-300"
                                            >
                                                <svg
                                                    className="w-7 h-7 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                Industry-Aligned Programs
                                            </h3>
                                            <p className="text-gray-700 leading-relaxed">
                                                Curated curriculum designed with
                                                industry experts to match
                                                real-world demands.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Feature Card 2 */}
                                    <div
                                        className="group relative p-8 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/90 
                                                shadow-2xl hover:shadow-secondary-500/40 transition-all duration-500 hover:scale-[1.03]
                                                hover:bg-white/85 ml-12 transform hover:rotate-1"
                                    >
                                        <div
                                            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary-500/10 to-primary-500/10 
                                                    opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        ></div>
                                        <div className="relative">
                                            <div
                                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary-500 to-primary-600 
                                                        flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 
                                                        group-hover:shadow-secondary-500/50 transition-all duration-300"
                                            >
                                                <svg
                                                    className="w-7 h-7 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                Expert Mentorship
                                            </h3>
                                            <p className="text-gray-700 leading-relaxed">
                                                Learn from industry
                                                professionals with years of
                                                practical experience.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Feature Card 3 */}
                                    <div
                                        className="group relative p-8 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/90 
                                                shadow-2xl hover:shadow-primary-500/40 transition-all duration-500 hover:scale-[1.03]
                                                hover:bg-white/85 transform hover:-rotate-1"
                                    >
                                        <div
                                            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 
                                                    opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        ></div>
                                        <div className="relative">
                                            <div
                                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 
                                                        flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 
                                                        group-hover:shadow-primary-500/50 transition-all duration-300"
                                            >
                                                <svg
                                                    className="w-7 h-7 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                Recognized Certification
                                            </h3>
                                            <p className="text-gray-700 leading-relaxed">
                                                Earn certifications valued by
                                                employers across the industry.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact & Support Section */}
                <div id="contact" className="relative z-10 px-6 lg:px-8 py-20">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                    Get In Touch
                                </span>
                            </h2>
                            <p className="text-xl text-gray-600">
                                We&apos;re here to help you every step of the
                                way
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mb-12">
                            {/* Contact Info Card */}
                            <div className="p-8 rounded-3xl bg-white/40 backdrop-blur-lg border border-white/70 shadow-xl">
                                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                                    Contact Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-6 h-6 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                Email
                                            </p>
                                            <div className="space-y-1">
                                                <a
                                                    href="mailto:ca@codezela.com"
                                                    className="text-primary-600 hover:text-primary-700 block"
                                                >
                                                    ca@codezela.com
                                                </a>
                                                <a
                                                    href="mailto:shamal@codezela.com"
                                                    className="text-primary-600 hover:text-primary-700 block"
                                                >
                                                    shamal@codezela.com
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-6 h-6 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                Phone / WhatsApp
                                            </p>
                                            <div className="space-y-1">
                                                <a
                                                    href="tel:+94766772923"
                                                    className="text-primary-600 hover:text-primary-700 block"
                                                >
                                                    +94 76 677 2923
                                                </a>
                                                <a
                                                    href="tel:+94766778438"
                                                    className="text-primary-600 hover:text-primary-700 block"
                                                >
                                                    +94 76 677 8438
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-6 h-6 text-white"
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
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                Support Hours
                                            </p>
                                            <p className="text-gray-600">
                                                24/7 Available
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Card */}
                            <div className="p-8 rounded-3xl bg-white/40 backdrop-blur-lg border border-white/70 shadow-xl">
                                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                                    Quick Actions
                                </h3>
                                <div className="space-y-4">
                                    <Link
                                        href="/register"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 
                                              text-white hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 
                                              shadow-lg hover:shadow-xl hover:scale-105 group"
                                    >
                                        <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold">
                                                Start Registration
                                            </p>
                                            <p className="text-sm opacity-90">
                                                Fill out the registration form
                                            </p>
                                        </div>
                                        <svg
                                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </Link>

                                    <a
                                        href="https://wa.me/94766772923"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 
                                              text-gray-800 hover:bg-white/80 transition-all duration-300 
                                              shadow-lg hover:shadow-xl hover:scale-105 group"
                                    >
                                        <svg
                                            className="w-6 h-6 text-green-600"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold">
                                                WhatsApp Support
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Chat with us instantly
                                            </p>
                                        </div>
                                        <svg
                                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </a>

                                    <a
                                        href="mailto:ca@codezela.com"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 
                                            text-gray-800 hover:bg-white/80 transition-all duration-300 
                                            shadow-lg hover:shadow-xl hover:scale-105 group"
                                    >
                                        <svg
                                            className="w-6 h-6 text-primary-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold">
                                                Email Support
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Send us a message
                                            </p>
                                        </div>
                                        <svg
                                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Social Media */}
                        <div className="text-center p-8 rounded-3xl bg-white/40 backdrop-blur-lg border border-white/70 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">
                                Connect With Us
                            </h3>
                            <div className="flex justify-center gap-4 flex-wrap">
                                <a
                                    href="https://www.facebook.com/codezelaca"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 
                                        flex items-center justify-center hover:bg-blue-500 hover:border-blue-500 
                                        transition-all duration-300 hover:scale-110 group shadow-lg"
                                >
                                    <svg
                                        className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </a>

                                <a
                                    href="https://www.instagram.com/codezelaca"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 
                                        flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 hover:border-pink-500 
                                        transition-all duration-300 hover:scale-110 group shadow-lg"
                                >
                                    <svg
                                        className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>

                                <a
                                    href="https://www.linkedin.com/company/codezelaca/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 
                                        flex items-center justify-center hover:bg-blue-700 hover:border-blue-700 
                                        transition-all duration-300 hover:scale-110 group shadow-lg"
                                >
                                    <svg
                                        className="w-6 h-6 text-blue-700 group-hover:text-white transition-colors"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>

                                <a
                                    href="https://x.com/codezelaca"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 
                                        flex items-center justify-center hover:bg-black hover:border-black 
                                        transition-all duration-300 hover:scale-110 group shadow-lg"
                                >
                                    <svg
                                        className="w-5 h-5 text-gray-800 group-hover:text-white transition-colors"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </a>

                                <a
                                    href="https://tiktok.com/@codezelaca"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 
                                        flex items-center justify-center hover:bg-black hover:border-black 
                                        transition-all duration-300 hover:scale-110 group shadow-lg"
                                >
                                    <svg
                                        className="w-6 h-6 text-gray-800 group-hover:text-white transition-colors"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
