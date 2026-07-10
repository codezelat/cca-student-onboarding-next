CREATE TABLE IF NOT EXISTS "certificates" (
    "id" BIGSERIAL NOT NULL,
    "registration_id" BIGINT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "result" VARCHAR(80),
    "issued_at" DATE NOT NULL,
    "program_code_snapshot" TEXT NOT NULL,
    "program_name_snapshot" TEXT NOT NULL,
    "program_year_snapshot" TEXT NOT NULL,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "program_modules" (
    "id" BIGSERIAL NOT NULL,
    "program_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credit_value" DECIMAL(5,2),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "program_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "certificates_registration_id_key" ON "certificates"("registration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_certificate_number_key" ON "certificates"("certificate_number");
CREATE INDEX IF NOT EXISTS "certificates_issued_at_idx" ON "certificates"("issued_at");
CREATE INDEX IF NOT EXISTS "certificates_result_idx" ON "certificates"("result");
CREATE INDEX IF NOT EXISTS "certificates_program_code_snapshot_idx" ON "certificates"("program_code_snapshot");
CREATE UNIQUE INDEX IF NOT EXISTS "program_modules_program_id_code_key" ON "program_modules"("program_id", "code");
CREATE INDEX IF NOT EXISTS "program_modules_program_id_display_order_idx" ON "program_modules"("program_id", "display_order");
CREATE INDEX IF NOT EXISTS "program_modules_program_id_is_active_idx" ON "program_modules"("program_id", "is_active");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificates_registration_id_fkey') THEN
        ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registration_id_fkey"
        FOREIGN KEY ("registration_id") REFERENCES "cca_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificates_created_by_fkey') THEN
        ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificates_updated_by_fkey') THEN
        ALTER TABLE "certificates" ADD CONSTRAINT "certificates_updated_by_fkey"
        FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'program_modules_program_id_fkey') THEN
        ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_program_id_fkey"
        FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'program_modules_created_by_fkey') THEN
        ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'program_modules_updated_by_fkey') THEN
        ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_updated_by_fkey"
        FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
