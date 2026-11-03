ALTER TABLE "cca_registrations" ADD COLUMN "closed_at" TIMESTAMPTZ(6);
CREATE INDEX "cca_registrations_deleted_at_closed_at_idx" ON "cca_registrations" ("deleted_at", "closed_at");
