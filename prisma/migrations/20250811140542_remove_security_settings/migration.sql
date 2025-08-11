/*
  Warnings:

  - The values [security] on the enum `system_setting_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."system_setting_category_new" AS ENUM ('notifications', 'lead_management', 'file_uploads', 'performance', 'integrations');
ALTER TABLE "public"."system_settings" ALTER COLUMN "category" TYPE "public"."system_setting_category_new" USING ("category"::text::"public"."system_setting_category_new");
ALTER TYPE "public"."system_setting_category" RENAME TO "system_setting_category_old";
ALTER TYPE "public"."system_setting_category_new" RENAME TO "system_setting_category";
DROP TYPE "public"."system_setting_category_old";
COMMIT;
