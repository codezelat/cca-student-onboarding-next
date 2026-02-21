import "dotenv/config";
import { prisma } from "../lib/prisma";

console.log("DIRECT_URL present:", !!process.env.DIRECT_URL);
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

const seedPrograms = [
    {
        code: "CCA-FS25",
        name: "Full Stack Developer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-FE25",
        name: "Frontend Developer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: false,
    },
    {
        code: "CCA-BE25",
        name: "Backend Developer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: false,
    },
    {
        code: "CCA-MA25",
        name: "Mobile App Developer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: false,
    },
    {
        code: "CCA-SE25",
        name: "Software Engineer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-DA25",
        name: "Data Analyst Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-DS25",
        name: "Data Scientist Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: false,
    },
    {
        code: "CCA-DE25",
        name: "Data Engineer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-AI25",
        name: "AI ML Engineer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-UX25",
        name: "UI UX Designer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-GD25",
        name: "Graphic Designer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-DM25",
        name: "Digital Marketing Specialist Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-SEO25",
        name: "SEO AEO Specialist Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: false,
    },
    {
        code: "CCA-DO25",
        name: "DevOps Engineer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-QA25",
        name: "QA Engineer Manual Automation Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-PM25",
        name: "Project Manager Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-BA25",
        name: "Business Analyst Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-CS25",
        name: "Cyber Security Engineer Career Accelerator",
        yearLabel: "2025",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-FS26",
        name: "Full Stack Developer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-SE26",
        name: "Software Engineer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-DA26",
        name: "Data Analyst Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-DE26",
        name: "Data Engineer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-AI26",
        name: "AI ML Engineer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-UX26",
        name: "UI UX Designer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-GD26",
        name: "Graphic Designer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-DM26",
        name: "Digital Marketing Specialist Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCA-SEO26",
        name: "SEO AEO Specialist Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-DO26",
        name: "DevOps Engineer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-QA26",
        name: "QA Engineer Manual Automation Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-PM26",
        name: "Project Manager Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-BA26",
        name: "Business Analyst Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
    {
        code: "CCB-CS26",
        name: "Cyber Security Engineer Career Bootcamp",
        yearLabel: "2026",
        durationLabel: "6 Months",
        isActive: true,
    },
];

async function main() {
    console.log("Starting program seeding...");

    for (let i = 0; i < seedPrograms.length; i++) {
        const p = seedPrograms[i];
        const program = await prisma.program.upsert({
            where: { code: p.code },
            update: {
                name: p.name,
                yearLabel: p.yearLabel,
                durationLabel: p.durationLabel,
                isActive: p.isActive,
                displayOrder: i + 1,
            },
            create: {
                code: p.code,
                name: p.name,
                yearLabel: p.yearLabel,
                durationLabel: p.durationLabel,
                isActive: p.isActive,
                displayOrder: i + 1,
                currency: "LKR",
            },
        });

        if (program.isActive) {
            await prisma.programIntakeWindow.upsert({
                where: {
                    programId_windowName: {
                        programId: program.id,
                        windowName: "Default Active Intake",
                    },
                },
                update: {
                    isActive: true,
                },
                create: {
                    programId: program.id,
                    windowName: "Default Active Intake",
                    opensAt: new Date(
                        Date.now() - 5 * 365 * 24 * 60 * 60 * 1000,
                    ), // 5 years ago
                    closesAt: new Date(
                        Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
                    ), // 5 years from now
                    isActive: true,
                },
            });
        }
    }

    console.log("✅ Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
