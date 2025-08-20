import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting simple database seed...");

  const isProduction = process.env.NODE_ENV === "production";
  const forceSeeding = process.env.FORCE_SEED === "true";

  if (isProduction && !forceSeeding) {
    console.error("❌ Use FORCE_SEED=true for production seeding");
    process.exit(1);
  }

  if (isProduction) {
    console.log("⚠️  PRODUCTION MODE - Proceeding immediately");
  }

  // Simple cleanup - just clear users and leads
  console.log("🧹 Clearing existing data...");
  
  try {
    // Clear in dependency order
    await prisma.$executeRaw`DELETE FROM "NotificationLog"`;
    await prisma.$executeRaw`DELETE FROM "FollowupQueue"`;
    await prisma.$executeRaw`DELETE FROM "Document"`;
    await prisma.$executeRaw`DELETE FROM "LeadNote"`;
    await prisma.$executeRaw`DELETE FROM "LeadStatusHistory"`;
    await prisma.$executeRaw`DELETE FROM "Lead"`;
    await prisma.$executeRaw`DELETE FROM "SystemSetting"`;
    await prisma.$executeRaw`DELETE FROM "User"`;
    
    console.log("✅ Data cleared");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    throw error;
  }

  // Create admin user
  console.log("👤 Creating admin user...");
  const adminPassword = await bcrypt.hash("admin123", 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: "ardabasoglu@gmail.com",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log("✅ Admin user created:", adminUser.email);

  // Create basic system settings
  console.log("⚙️  Creating system settings...");
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'sms_notifications_enabled',
        value: 'false',
        type: 'BOOLEAN',
        category: 'NOTIFICATIONS',
        description: 'Enable or disable SMS notifications globally',
        defaultValue: 'true',
      },
      {
        key: 'email_notifications_enabled',
        value: 'false',
        type: 'BOOLEAN',
        category: 'NOTIFICATIONS',
        description: 'Enable or disable email notifications globally',
        defaultValue: 'true',
      }
    ]
  });

  console.log("✅ Simple seed completed successfully!");
  console.log("🔐 Admin login: ardabasoglu@gmail.com / admin123");
}

// Timeout protection
const timeout = setTimeout(() => {
  console.error("❌ Seed timed out");
  process.exit(1);
}, 60000); // 1 minute timeout

main()
  .then(() => {
    clearTimeout(timeout);
    console.log("🎉 All done!");
  })
  .catch((e) => {
    clearTimeout(timeout);
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });