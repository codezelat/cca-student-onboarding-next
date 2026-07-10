ALTER TABLE "certificates"
    ADD COLUMN IF NOT EXISTS "is_custom_number" BOOLEAN NOT NULL DEFAULT false;
