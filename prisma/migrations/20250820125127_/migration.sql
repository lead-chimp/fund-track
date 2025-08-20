-- AlterEnum
ALTER TYPE "system_setting_category" ADD VALUE 'connectivity';

-- DropIndex
DROP INDEX "idx_notification_log_created_at_id";
