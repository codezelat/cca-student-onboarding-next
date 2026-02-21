import { notFound } from "next/navigation";
import { getProgramById } from "../../programs-actions";
import ProgramForm from "../../components/program-form";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProgramPage({ params }: PageProps) {
    const { id } = await params;
    const program = await getProgramById(id);

    if (!program) {
        notFound();
    }

    return (
        <div className="py-8">
            <ProgramForm program={program} />
        </div>
    );
}
