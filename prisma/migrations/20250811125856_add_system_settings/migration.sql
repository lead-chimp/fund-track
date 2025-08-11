-- CreateEnum
CREATE TYPE "public"."system_setting_type" AS ENUM ('boolean', 'string', 'number', 'json');

-- CreateEnum
CREATE TYPE "public"."system_setting_category" AS ENUM ('notifications', 'lead_management', 'security', 'file_uploads', 'performance', 'integrations');

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "public"."system_setting_type" NOT NULL,
    "category" "public"."system_setting_category" NOT NULL,
    "description" TEXT NOT NULL,
    "default_value" TEXT NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- AddForeignKey
ALTER TABLE "public"."system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
