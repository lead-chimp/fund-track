import { PrismaClient, SystemSettingType, SystemSettingCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const systemSettingsData = [
  // Notification Settings
  {
    key: 'sms_notifications_enabled',
    value: 'true',
    type: SystemSettingType.BOOLEAN,
    category: SystemSettingCategory.NOTIFICATIONS,
    description: 'Enable or disable SMS notifications globally',
    defaultValue: 'true',
  },
  {
    key: 'email_notifications_enabled',
    value: 'true',
    type: SystemSettingType.BOOLEAN,
    category: SystemSettingCategory.NOTIFICATIONS,
    description: 'Enable or disable email notifications globally',
    defaultValue: 'true',
  },
  {
    key: 'notification_retry_attempts',
    value: '3',
    type: SystemSettingType.NUMBER,
    category: SystemSettingCategory.NOTIFICATIONS,
    description: 'Maximum number of retry attempts for failed notifications',
    defaultValue: '3',
  },
  {
    key: 'notification_retry_delay',
    value: '1000',
    type: SystemSettingType.NUMBER,
    category: SystemSettingCategory.NOTIFICATIONS,
    description: 'Base delay in milliseconds between notification retries',
    defaultValue: '1000',
  },





];

export async function seedSystemSettings() {
  console.log('Seeding system settings...');
  
  for (const setting of systemSettingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        description: setting.description,
        defaultValue: setting.defaultValue,
        type: setting.type,
        category: setting.category,
      },
      create: setting,
    });
  }
  
  console.log(`Seeded ${systemSettingsData.length} system settings`);
}

if (require.main === module) {
  seedSystemSettings()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}