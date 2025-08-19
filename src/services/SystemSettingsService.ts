import { prisma } from '@/lib/prisma';
import { SystemSetting, SystemSettingType, SystemSettingCategory } from '@prisma/client';

// Type definitions for settings
export interface SystemSettingValue {
  boolean: boolean;
  string: string;
  number: number;
  json: any;
}

export interface TypedSystemSetting<T extends keyof SystemSettingValue> {
  key: string;
  value: SystemSettingValue[T];
  type: SystemSettingType;
  category: SystemSettingCategory;
  description: string;
  defaultValue: SystemSettingValue[T];
  updatedBy?: number;
  updatedAt: Date;
}

// Cache interface
interface SettingsCache {
  data: Map<string, SystemSetting>;
  lastUpdated: Date;
  ttl: number; // Time to live in milliseconds
}

export class SystemSettingsService {
  private cache: SettingsCache = {
    data: new Map(),
    lastUpdated: new Date(0),
    ttl: 5 * 60 * 1000, // 5 minutes
  };

  /**
   * Get a setting value with type safety
   */
  async getSetting<T extends keyof SystemSettingValue>(
    key: string,
    type: T
  ): Promise<SystemSettingValue[T]> {
    const setting = await this.getSettingRaw(key);
    
    if (!setting) {
      throw new Error(`Setting '${key}' not found`);
    }

    return this.parseSettingValue(setting.value, type);
  }

  /**
   * Get a setting with fallback to default value
   */
  async getSettingWithDefault<T extends keyof SystemSettingValue>(
    key: string,
    type: T,
    fallback: SystemSettingValue[T]
  ): Promise<SystemSettingValue[T]> {
    try {
      return await this.getSetting(key, type);
    } catch {
      return fallback;
    }
  }

  /**
   * Get raw setting object
   */
  async getSettingRaw(key: string): Promise<SystemSetting | null> {
    await this.refreshCacheIfNeeded();
    return this.cache.data.get(key) || null;
  }

  /**
   * Get all settings by category
   */
  async getSettingsByCategory(category: SystemSettingCategory): Promise<SystemSetting[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.cache.data.values()).filter(
      setting => setting.category === category
    );
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.cache.data.values());
  }

  /**
   * Update a setting value
   */
  async updateSetting(
    key: string,
    value: string,
    updatedBy?: number
  ): Promise<SystemSetting> {
    // Validate the setting exists
    const existingSetting = await this.getSettingRaw(key);
    if (!existingSetting) {
      throw new Error(`Setting '${key}' not found`);
    }

    // Validate the value format
    this.validateSettingValue(value, existingSetting.type);

    // Validate user exists if updatedBy is provided
    let finalUpdatedBy: number | null = updatedBy ?? null;
    if (updatedBy !== undefined) {
      const userExists = await prisma.user.findUnique({
        where: { id: updatedBy },
        select: { id: true }
      });
      
      if (!userExists) {
        console.warn(`User with ID ${updatedBy} not found, setting updatedBy to null`);
        finalUpdatedBy = null;
      }
    }

    // Update in database
    const updatedSetting = await prisma.systemSetting.update({
      where: { key },
      data: {
        value,
        updatedBy: finalUpdatedBy,
        updatedAt: new Date(),
      },
    });

    // Update cache
    this.cache.data.set(key, updatedSetting);

    return updatedSetting;
  }

  /**
   * Bulk update settings
   */
  async updateSettings(
    updates: Array<{ key: string; value: string }>,
    updatedBy?: number
  ): Promise<SystemSetting[]> {
    const results: SystemSetting[] = [];

    // Use transaction for consistency
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const existingSetting = await tx.systemSetting.findUnique({
          where: { key: update.key },
        });

        if (!existingSetting) {
          throw new Error(`Setting '${update.key}' not found`);
        }

        this.validateSettingValue(update.value, existingSetting.type);

        const updatedSetting = await tx.systemSetting.update({
          where: { key: update.key },
          data: {
            value: update.value,
            updatedBy: updatedBy ?? null,
            updatedAt: new Date(),
          },
        });

        results.push(updatedSetting);
      }
    });

    // Refresh cache after bulk update
    await this.refreshCache();

    return results;
  }

  /**
   * Reset setting to default value
   */
  async resetSetting(key: string, updatedBy?: number): Promise<SystemSetting> {
    const setting = await this.getSettingRaw(key);
    if (!setting) {
      throw new Error(`Setting '${key}' not found`);
    }

    // Validate user exists if updatedBy is provided
    let finalUpdatedBy: number | null = updatedBy ?? null;
    if (updatedBy !== undefined) {
      const userExists = await prisma.user.findUnique({
        where: { id: updatedBy },
        select: { id: true }
      });
      
      if (!userExists) {
        console.warn(`User with ID ${updatedBy} not found, setting updatedBy to null`);
        finalUpdatedBy = null;
      }
    }

    return this.updateSetting(key, setting.defaultValue, finalUpdatedBy ?? undefined);
  }

  /**
   * Reset all settings in a category to defaults
   */
  async resetCategorySettings(
    category: SystemSettingCategory,
    updatedBy?: number
  ): Promise<SystemSetting[]> {
    const settings = await this.getSettingsByCategory(category);
    const updates = settings.map(setting => ({
      key: setting.key,
      value: setting.defaultValue,
    }));

    return this.updateSettings(updates, updatedBy);
  }

  /**
   * Get settings audit trail
   */
  async getSettingsAuditTrail(limit: number = 50) {
    return prisma.systemSetting.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Validate setting value format
   */
  private validateSettingValue(value: string, type: SystemSettingType): void {
    try {
      switch (type) {
        case SystemSettingType.BOOLEAN:
          if (!['true', 'false'].includes(value.toLowerCase())) {
            throw new Error('Boolean value must be "true" or "false"');
          }
          break;
        case SystemSettingType.NUMBER:
          if (isNaN(Number(value))) {
            throw new Error('Number value must be a valid number');
          }
          break;
        case SystemSettingType.JSON:
          JSON.parse(value);
          break;
        case SystemSettingType.STRING:
          // String values are always valid
          break;
        default:
          throw new Error(`Unknown setting type: ${type}`);
      }
    } catch (error) {
      throw new Error(`Invalid value for ${type} setting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse setting value to correct type
   */
  private parseSettingValue<T extends keyof SystemSettingValue>(
    value: string,
    type: T
  ): SystemSettingValue[T] {
    switch (type) {
      case 'boolean':
        return (value.toLowerCase() === 'true') as SystemSettingValue[T];
      case 'number':
        return Number(value) as SystemSettingValue[T];
      case 'json':
        return JSON.parse(value) as SystemSettingValue[T];
      case 'string':
      default:
        return value as SystemSettingValue[T];
    }
  }

  /**
   * Refresh cache if TTL expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastUpdated.getTime();

    if (cacheAge > this.cache.ttl || this.cache.data.size === 0) {
      await this.refreshCache();
    }
  }

  /**
   * Force refresh cache
   */
  private async refreshCache(): Promise<void> {
    const settings = await prisma.systemSetting.findMany();
    
    this.cache.data.clear();
    settings.forEach(setting => {
      this.cache.data.set(setting.key, setting);
    });
    
    this.cache.lastUpdated = new Date();
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.data.clear();
    this.cache.lastUpdated = new Date(0);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.data.size,
      lastUpdated: this.cache.lastUpdated,
      ttl: this.cache.ttl,
      age: new Date().getTime() - this.cache.lastUpdated.getTime(),
    };
  }
}

// Singleton instance
export const systemSettingsService = new SystemSettingsService();

// Convenience functions for common settings
export const getNotificationSettings = async () => {
  return {
    smsEnabled: await systemSettingsService.getSettingWithDefault('sms_notifications_enabled', 'boolean', true),
    emailEnabled: await systemSettingsService.getSettingWithDefault('email_notifications_enabled', 'boolean', true),
    retryAttempts: await systemSettingsService.getSettingWithDefault('notification_retry_attempts', 'number', 3),
    retryDelay: await systemSettingsService.getSettingWithDefault('notification_retry_delay', 'number', 1000),
  };
};

