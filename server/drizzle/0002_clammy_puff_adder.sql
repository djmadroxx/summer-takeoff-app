ALTER TABLE "users" ADD COLUMN "username" varchar(50);

UPDATE "users"
SET "username" = 'testuser'
WHERE "username" IS NULL;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");