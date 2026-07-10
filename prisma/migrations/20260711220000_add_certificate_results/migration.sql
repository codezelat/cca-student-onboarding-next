DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'CertificateResult'
    ) THEN
        CREATE TYPE "CertificateResult" AS ENUM (
            'A', 'B', 'C', 'D', 'F', 'Pass', 'Merit', 'Distinction', 'Refer', 'Withheld'
        );
    END IF;
END $$;

ALTER TABLE "certificates"
    ALTER COLUMN "result" TYPE "CertificateResult"
    USING "result"::text::"CertificateResult";

ALTER TABLE "certificates"
    ALTER COLUMN "result" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "certificate_module_results" (
    "certificate_id" BIGINT NOT NULL,
    "program_module_id" BIGINT NOT NULL,
    "result" "CertificateResult" NOT NULL,
    "module_code_snapshot" TEXT NOT NULL,
    "module_name_snapshot" TEXT NOT NULL,
    "credit_value_snapshot" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "certificate_module_results_pkey" PRIMARY KEY ("certificate_id", "program_module_id")
);

CREATE INDEX IF NOT EXISTS "certificate_module_results_program_module_id_idx"
    ON "certificate_module_results"("program_module_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'certificate_module_results_certificate_id_fkey'
    ) THEN
        ALTER TABLE "certificate_module_results"
            ADD CONSTRAINT "certificate_module_results_certificate_id_fkey"
            FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'certificate_module_results_program_module_id_fkey'
    ) THEN
        ALTER TABLE "certificate_module_results"
            ADD CONSTRAINT "certificate_module_results_program_module_id_fkey"
            FOREIGN KEY ("program_module_id") REFERENCES "program_modules"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
