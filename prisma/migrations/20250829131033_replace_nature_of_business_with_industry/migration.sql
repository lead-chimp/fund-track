/*
  Warnings:

  - You are about to drop the column `date_business_started` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `nature_of_business` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `personal_city` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `personal_state` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "date_business_started",
DROP COLUMN "nature_of_business",
DROP COLUMN "personal_city",
DROP COLUMN "personal_state";
