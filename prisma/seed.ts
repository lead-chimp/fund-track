import { PrismaClient, UserRole, LeadStatus, FollowupType, FollowupStatus, NotificationType, NotificationStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data in correct order (respecting foreign key constraints)
  await prisma.notificationLog.deleteMany()
  await prisma.followupQueue.deleteMany()
  await prisma.document.deleteMany()
  await prisma.leadNote.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleared existing data')

  // Create sample users
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('user123', 12)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@merchantfunding.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@merchantfunding.com',
      passwordHash: userPassword,
      role: UserRole.USER,
    },
  })

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@merchantfunding.com',
      passwordHash: userPassword,
      role: UserRole.USER,
    },
  })

  console.log('👥 Created sample users')

  // Create sample leads with various statuses
  const leads = await Promise.all([
    // New lead - just imported
    prisma.lead.create({
      data: {
        legacyLeadId: 1001,
        campaignId: 123,
        email: 'john.doe@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Doe Enterprises LLC',
        status: LeadStatus.NEW,
        intakeToken: 'token_new_lead_001',
        importedAt: new Date(),
      },
    }),

    // Pending lead - intake started but not completed
    prisma.lead.create({
      data: {
        legacyLeadId: 1002,
        campaignId: 123,
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        firstName: 'Jane',
        lastName: 'Smith',
        businessName: 'Smith & Associates',
        status: LeadStatus.PENDING,
        intakeToken: 'token_pending_lead_002',
        importedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),

    // In progress lead - being reviewed by staff
    prisma.lead.create({
      data: {
        legacyLeadId: 1003,
        campaignId: 123,
        email: 'mike.johnson@example.com',
        phone: '+1234567892',
        firstName: 'Mike',
        lastName: 'Johnson',
        businessName: 'Johnson Construction Inc',
        status: LeadStatus.IN_PROGRESS,
        intakeToken: 'token_inprogress_lead_003',
        intakeCompletedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        importedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      },
    }),

    // Completed lead
    prisma.lead.create({
      data: {
        legacyLeadId: 1004,
        campaignId: 123,
        email: 'sarah.wilson@example.com',
        phone: '+1234567893',
        firstName: 'Sarah',
        lastName: 'Wilson',
        businessName: 'Wilson Retail Solutions',
        status: LeadStatus.COMPLETED,
        intakeToken: 'token_completed_lead_004',
        intakeCompletedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        importedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
      },
    }),

    // Rejected lead
    prisma.lead.create({
      data: {
        legacyLeadId: 1005,
        campaignId: 123,
        email: 'bob.brown@example.com',
        phone: '+1234567894',
        firstName: 'Bob',
        lastName: 'Brown',
        businessName: 'Brown Manufacturing',
        status: LeadStatus.REJECTED,
        intakeToken: 'token_rejected_lead_005',
        intakeCompletedAt: new Date(Date.now() - 96 * 60 * 60 * 1000), // 4 days ago
        importedAt: new Date(Date.now() - 120 * 60 * 60 * 1000), // 5 days ago
      },
    }),

    // Lead without business name (individual)
    prisma.lead.create({
      data: {
        legacyLeadId: 1006,
        campaignId: 123,
        email: 'alice.green@example.com',
        phone: '+1234567895',
        firstName: 'Alice',
        lastName: 'Green',
        businessName: null,
        status: LeadStatus.NEW,
        intakeToken: 'token_individual_lead_006',
        importedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    }),
  ])

  console.log('📋 Created sample leads')

  // Create sample lead notes
  await Promise.all([
    prisma.leadNote.create({
      data: {
        leadId: leads[2].id, // In progress lead
        userId: adminUser.id,
        content: 'Initial review completed. Documents look good, proceeding with verification.',
      },
    }),
    prisma.leadNote.create({
      data: {
        leadId: leads[2].id, // In progress lead
        userId: regularUser.id,
        content: 'Called customer to verify business information. All details confirmed.',
      },
    }),
    prisma.leadNote.create({
      data: {
        leadId: leads[3].id, // Completed lead
        userId: adminUser.id,
        content: 'Application approved. Funding amount: $50,000. Terms: 12 months.',
      },
    }),
    prisma.leadNote.create({
      data: {
        leadId: leads[4].id, // Rejected lead
        userId: salesUser.id,
        content: 'Application rejected due to insufficient credit score. Advised to reapply in 6 months.',
      },
    }),
  ])

  console.log('📝 Created sample lead notes')

  // Create sample documents
  await Promise.all([
    prisma.document.create({
      data: {
        leadId: leads[2].id, // In progress lead
        filename: 'bank_statement_1.pdf',
        originalFilename: 'January 2024 Bank Statement.pdf',
        fileSize: 1024000, // 1MB
        mimeType: 'application/pdf',
        b2FileId: 'mock_b2_file_id_001',
        b2BucketName: 'merchant-funding-documents',
        uploadedBy: null, // Uploaded by prospect
      },
    }),
    prisma.document.create({
      data: {
        leadId: leads[2].id, // In progress lead
        filename: 'bank_statement_2.pdf',
        originalFilename: 'February 2024 Bank Statement.pdf',
        fileSize: 1100000, // 1.1MB
        mimeType: 'application/pdf',
        b2FileId: 'mock_b2_file_id_002',
        b2BucketName: 'merchant-funding-documents',
        uploadedBy: null, // Uploaded by prospect
      },
    }),
    prisma.document.create({
      data: {
        leadId: leads[2].id, // In progress lead
        filename: 'business_license.jpg',
        originalFilename: 'Business License.jpg',
        fileSize: 2048000, // 2MB
        mimeType: 'image/jpeg',
        b2FileId: 'mock_b2_file_id_003',
        b2BucketName: 'merchant-funding-documents',
        uploadedBy: null, // Uploaded by prospect
      },
    }),
    prisma.document.create({
      data: {
        leadId: leads[3].id, // Completed lead
        filename: 'additional_docs.pdf',
        originalFilename: 'Additional Documentation.pdf',
        fileSize: 512000, // 512KB
        mimeType: 'application/pdf',
        b2FileId: 'mock_b2_file_id_004',
        b2BucketName: 'merchant-funding-documents',
        uploadedBy: adminUser.id, // Uploaded by staff
      },
    }),
  ])

  console.log('📄 Created sample documents')

  // Create sample follow-up queue entries
  await Promise.all([
    // Pending follow-ups for pending lead
    prisma.followupQueue.create({
      data: {
        leadId: leads[1].id, // Pending lead
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        followupType: FollowupType.THREE_HOUR,
        status: FollowupStatus.PENDING,
      },
    }),
    prisma.followupQueue.create({
      data: {
        leadId: leads[1].id, // Pending lead
        scheduledAt: new Date(Date.now() + 7 * 60 * 60 * 1000), // 7 hours from now
        followupType: FollowupType.NINE_HOUR,
        status: FollowupStatus.PENDING,
      },
    }),
    // Sent follow-up for new lead
    prisma.followupQueue.create({
      data: {
        leadId: leads[0].id, // New lead
        scheduledAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        followupType: FollowupType.THREE_HOUR,
        status: FollowupStatus.SENT,
        sentAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    }),
    // Cancelled follow-up for completed lead
    prisma.followupQueue.create({
      data: {
        leadId: leads[3].id, // Completed lead
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        followupType: FollowupType.TWENTY_FOUR_H,
        status: FollowupStatus.CANCELLED,
      },
    }),
  ])

  console.log('⏰ Created sample follow-up queue entries')

  // Create sample notification logs
  await Promise.all([
    // Initial intake notifications
    prisma.notificationLog.create({
      data: {
        leadId: leads[0].id, // New lead
        type: NotificationType.EMAIL,
        recipient: 'john.doe@example.com',
        subject: 'Complete Your Merchant Funding Application',
        content: 'Thank you for your interest in merchant funding. Please complete your application at: http://localhost:3000/application/token_new_lead_001',
        status: NotificationStatus.SENT,
        externalId: 'mailgun_msg_001',
        sentAt: new Date(),
      },
    }),
    prisma.notificationLog.create({
      data: {
        leadId: leads[0].id, // New lead
        type: NotificationType.SMS,
        recipient: '+1234567890',
        subject: null,
        content: 'Complete your merchant funding application: http://localhost:3000/application/token_new_lead_001',
        status: NotificationStatus.SENT,
        externalId: 'twilio_msg_001',
        sentAt: new Date(),
      },
    }),
    // Follow-up notifications
    prisma.notificationLog.create({
      data: {
        leadId: leads[1].id, // Pending lead
        type: NotificationType.EMAIL,
        recipient: 'jane.smith@example.com',
        subject: 'Reminder: Complete Your Merchant Funding Application',
        content: 'This is a friendly reminder to complete your merchant funding application.',
        status: NotificationStatus.SENT,
        externalId: 'mailgun_msg_002',
        sentAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
    }),
    // Failed notification
    prisma.notificationLog.create({
      data: {
        leadId: leads[4].id, // Rejected lead
        type: NotificationType.SMS,
        recipient: '+1234567894',
        subject: null,
        content: 'Your merchant funding application status has been updated.',
        status: NotificationStatus.FAILED,
        errorMessage: 'Invalid phone number format',
      },
    }),
  ])

  console.log('📧 Created sample notification logs')

  // Print summary
  const userCount = await prisma.user.count()
  const leadCount = await prisma.lead.count()
  const noteCount = await prisma.leadNote.count()
  const documentCount = await prisma.document.count()
  const followupCount = await prisma.followupQueue.count()
  const notificationCount = await prisma.notificationLog.count()

  console.log('\n✅ Database seeded successfully!')
  console.log(`📊 Summary:`)
  console.log(`   Users: ${userCount}`)
  console.log(`   Leads: ${leadCount}`)
  console.log(`   Notes: ${noteCount}`)
  console.log(`   Documents: ${documentCount}`)
  console.log(`   Follow-ups: ${followupCount}`)
  console.log(`   Notifications: ${notificationCount}`)
  console.log('\n🔐 Test Credentials:')
  console.log('   Admin: admin@merchantfunding.com / admin123')
  console.log('   User: user@merchantfunding.com / user123')
  console.log('   Sales: sales@merchantfunding.com / user123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })