import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting production database seed...')

  // Production safety checks
  const isProduction = process.env.NODE_ENV === 'production'
  const forceSeeding = process.env.FORCE_SEED === 'true'
  
  if (!isProduction) {
    console.error('❌ This script is only for production environments.')
    console.error('   Use npm run db:seed for development seeding.')
    process.exit(1)
  }

  if (!forceSeeding) {
    console.error('❌ Production seeding requires explicit confirmation.')
    console.error('   Use: FORCE_SEED=true npm run db:seed:prod')
    process.exit(1)
  }

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  })
  
  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping production seed.')
    console.log(`   Admin email: ${existingAdmin.email}`)
    return
  }

  console.log('⚠️  Creating initial admin user for production...')
  console.log('⏳ Starting in 3 seconds... Press Ctrl+C to cancel')
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Create only essential admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@merchantfunding.com'
  
  if (adminPassword === 'ChangeMe123!') {
    console.error('❌ Please set ADMIN_PASSWORD environment variable')
    console.error('   Example: ADMIN_PASSWORD=secure_password FORCE_SEED=true npm run db:seed:prod')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
    },
  })

  console.log('✅ Production seed completed successfully!')
  console.log(`📊 Created admin user: ${adminUser.email}`)
  console.log('🔐 Please change the admin password after first login')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding production database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })