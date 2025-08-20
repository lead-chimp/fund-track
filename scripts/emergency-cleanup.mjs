#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencyCleanup() {
  try {
    console.log('🚨 Starting emergency notification cleanup...\n');

    // Get current stats
    const totalBefore = await prisma.notificationLog.count();
    console.log(`📊 Total notifications before cleanup: ${totalBefore.toLocaleString()}`);

    if (totalBefore === 0) {
      console.log('✅ No notifications to clean up.');
      return;
    }

    // Show breakdown by status
    const statusBreakdown = await prisma.notificationLog.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\n📈 Breakdown by status:');
    statusBreakdown.forEach(item => {
      console.log(`  ${item.status}: ${item._count.toLocaleString()}`);
    });

    // Find leads with excessive notifications
    const excessiveLeads = await prisma.$queryRaw`
      SELECT 
        l.id,
        l.email,
        COUNT(nl.id) as notification_count
      FROM leads l
      LEFT JOIN notification_log nl ON l.id = nl.lead_id
      GROUP BY l.id, l.email
      HAVING COUNT(nl.id) > 100
      ORDER BY COUNT(nl.id) DESC
      LIMIT 10
    `;

    if (excessiveLeads.length > 0) {
      console.log('\n🔥 Leads with excessive notifications (>100):');
      excessiveLeads.forEach(lead => {
        console.log(`  ${lead.email}: ${Number(lead.notification_count).toLocaleString()} notifications`);
      });
    }

    // Ask for confirmation if there are many records
    if (totalBefore > 1000) {
      console.log(`\n⚠️  WARNING: About to delete ${totalBefore.toLocaleString()} notification records!`);
      console.log('This action cannot be undone.');
      
      // In a real scenario, you might want to add a confirmation prompt
      // For now, we'll proceed with a safety check
      const isEmergency = process.env.EMERGENCY_CLEANUP === 'true';
      if (!isEmergency) {
        console.log('❌ Emergency cleanup not confirmed. Set EMERGENCY_CLEANUP=true to proceed.');
        console.log('Example: EMERGENCY_CLEANUP=true node scripts/emergency-cleanup.mjs');
        return;
      }
    }

    console.log('\n🧹 Starting cleanup...');

    // Strategy 1: Keep only the most recent 5 notifications per lead
    console.log('Step 1: Cleaning up excessive notifications per lead...');
    
    const leadsWithNotifications = await prisma.$queryRaw`
      SELECT DISTINCT lead_id 
      FROM notification_log 
      WHERE lead_id IS NOT NULL
    `;

    let totalDeleted = 0;
    
    for (const lead of leadsWithNotifications) {
      const leadId = lead.lead_id;
      
      // Get the 5 most recent notifications for this lead
      const recentNotifications = await prisma.notificationLog.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true }
      });

      const idsToKeep = recentNotifications.map(n => n.id);

      // Delete all other notifications for this lead
      const deleteResult = await prisma.notificationLog.deleteMany({
        where: {
          leadId,
          id: { notIn: idsToKeep }
        }
      });

      totalDeleted += deleteResult.count;
      
      if (deleteResult.count > 0) {
        console.log(`  Cleaned lead ${leadId}: deleted ${deleteResult.count} notifications`);
      }
    }

    // Strategy 2: Delete all notifications older than 7 days
    console.log('\nStep 2: Deleting notifications older than 7 days...');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldNotificationsResult = await prisma.notificationLog.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo }
      }
    });

    totalDeleted += oldNotificationsResult.count;
    console.log(`  Deleted ${oldNotificationsResult.count} old notifications`);

    // Get final stats
    const totalAfter = await prisma.notificationLog.count();
    
    console.log('\n✅ Emergency cleanup completed!');
    console.log(`📊 Total notifications after cleanup: ${totalAfter.toLocaleString()}`);
    console.log(`🗑️  Total deleted: ${totalDeleted.toLocaleString()}`);
    console.log(`💾 Space saved: ${((totalBefore - totalAfter) / totalBefore * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyCleanup();