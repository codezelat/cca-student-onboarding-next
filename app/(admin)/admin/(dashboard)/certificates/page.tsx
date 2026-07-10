import CertificatesClient from "./certificates-client";
import {
  getCertificateProgramOptions,
  getCertificates,
} from "./certificates-actions";

function getSearchParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = getSearchParam(params.search);
  const program = getSearchParam(params.program);
  const result = getSearchParam(params.result);
  const page = Math.max(1, Number(getSearchParam(params.page)) || 1);

  const [certificates, programs] = await Promise.all([
    getCertificates({ search, program, result, page }),
    getCertificateProgramOptions(),
  ]);

  return (
    <div className="space-y-8">
      <CertificatesClient
        key={`${search}-${program}-${result}-${certificates.page}`}
        initialCertificates={certificates.data}
        programs={programs}
        currentSearch={search}
        currentProgram={program}
        currentResult={result}
        currentPage={certificates.page}
        pageSize={certificates.pageSize}
        totalPages={certificates.totalPages}
        totalRows={certificates.total}
      />
    </div>
  );
}
