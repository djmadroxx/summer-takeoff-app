ALTER TABLE "users" ADD COLUMN "qr_token" varchar(64);

UPDATE "users"
SET "qr_token" = '7f3c9a2e8b1d4f6a9c0e5b7d2a8f1c34e6b9d0a7c2f5e8b1a4d6c9f2e7b3a5'
WHERE "qr_token" IS NULL;

ALTER TABLE "users" ALTER COLUMN "qr_token" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_qr_token_unique" UNIQUE("qr_token");