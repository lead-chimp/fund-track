import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class NotificationCleanupService {
  /**
   * Clean up old notification logs to prevent database bloat
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<{
    deletedCount: number;
    success: boolean;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      logger.info(`Starting notification cleanup for records older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`);

      // Delete old notification logs
      const result = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          // Keep failed notifications for a shorter period for debugging
          OR: [
            {
              status: 'SENT',
            },
            {
              status: 'FAILED',
              createdAt: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Keep failed for only 7 days
              },
            },
          ],
        },
      });

      logger.info(`Notification cleanup completed: deleted ${result.count} records`);

      return {
        deletedCount: result.count,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Notification cleanup failed', { error: errorMessage });
      
      return {
        deletedCount: 0,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clean up excessive notifications for a specific lead (emergency cleanup)
   */
  async cleanupExcessiveNotificationsForLead(
    leadId: number,
    maxNotificationsToKeep: number = 10
  ): Promise<{
    deletedCount: number;
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info(`Starting excessive notification cleanup for lead ${leadId}, keeping max ${maxNotificationsToKeep} records`);

      // Get the most recent notifications to keep
      const notificationsToKeep = await prisma.notificationLog.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: maxNotificationsToKeep,
        select: { id: true },
      });

      const idsToKeep = notificationsToKeep.map(n => n.id);

      // Delete all other notifications for this lead
      const result = await prisma.notificationLog.deleteMany({
        where: {
          leadId,
          id: {
            notIn: idsToKeep,
          },
        },
      });

      logger.info(`Excessive notification cleanup completed for lead ${leadId}: deleted ${result.count} records`);

      return {
        deletedCount: result.count,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Excessive notification cleanup failed for lead ${leadId}`, { error: errorMessage });
      
      return {
        deletedCount: 0,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get notification statistics for monitoring
   */
  async getNotificationStats(): Promise<{
    totalNotifications: number;
    notificationsByStatus: Record<string, number>;
    notificationsByType: Record<string, number>;
    oldestNotification?: Date;
    newestNotification?: Date;
    leadsWithExcessiveNotifications: Array<{
      leadId: number;
      email: string | null;
      notificationCount: number;
    }>;
  }> {
    try {
      const totalNotifications = await prisma.notificationLog.count();

      const byStatus = await prisma.notificationLog.groupBy({
        by: ['status'],
        _count: true,
      });

      const byType = await prisma.notificationLog.groupBy({
        by: ['type'],
        _count: true,
      });

      const oldest = await prisma.notificationLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const newest = await prisma.notificationLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      // Find leads with excessive notifications (more than 50)
      const excessiveNotifications = await prisma.$queryRaw<Array<{
        leadId: number;
        email: string | null;
        notificationCount: bigint;
      }>>`
        SELECT 
          l.id as "leadId",
          l.email,
          COUNT(nl.id) as "notificationCount"
        FROM leads l
        LEFT JOIN notification_log nl ON l.id = nl.lead_id
        GROUP BY l.id, l.email
        HAVING COUNT(nl.id) > 50
        ORDER BY COUNT(nl.id) DESC
        LIMIT 20
      `;

      return {
        totalNotifications,
        notificationsByStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        notificationsByType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
        oldestNotification: oldest?.createdAt,
        newestNotification: newest?.createdAt,
        leadsWithExcessiveNotifications: excessiveNotifications.map(item => ({
          leadId: item.leadId,
          email: item.email,
          notificationCount: Number(item.notificationCount),
        })),
      };
    } catch (error) {
      logger.error('Failed to get notification stats', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Emergency cleanup for database with millions of records
   */
  async emergencyCleanup(): Promise<{
    deletedCount: number;
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('Starting emergency notification cleanup...');

      // Delete all notifications older than 7 days
      const result = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      logger.info(`Emergency cleanup completed: deleted ${result.count} records`);

      return {
        deletedCount: result.count,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Emergency cleanup failed', { error: errorMessage });
      
      return {
        deletedCount: 0,
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const notificationCleanupService = new NotificationCleanupService();