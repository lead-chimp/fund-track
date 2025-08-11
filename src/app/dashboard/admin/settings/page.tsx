'use client';

import { useState, useEffect } from 'react';
import { SystemSetting, SystemSettingCategory } from '@prisma/client';
import { SettingsCard } from '@/components/admin/SettingsCard';
import { SettingsAuditLog } from '@/components/admin/SettingsAuditLog';

const CATEGORY_LABELS = {
  [SystemSettingCategory.NOTIFICATIONS]: 'Notifications',
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SystemSettingCategory>(SystemSettingCategory.NOTIFICATIONS);
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingUpdate = async (key: string, value: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update setting');
      }

      // Refresh settings
      await fetchSettings();
    } catch (err) {
      throw err; // Re-throw to be handled by the component
    }
  };

  const handleSettingReset = async (key: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset setting');
      }

      // Refresh settings
      await fetchSettings();
    } catch (err) {
      throw err; // Re-throw to be handled by the component
    }
  };

  const getSettingsByCategory = (category: SystemSettingCategory) => {
    return settings.filter(setting => setting.category === category);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchSettings}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure system-wide settings and preferences
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {showAuditLog ? 'Hide' : 'Show'} Audit Log
            </button>
          </div>
        </div>

        {/* Audit Log */}
        {showAuditLog && (
          <div className="mb-8">
            <SettingsAuditLog />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <button
                key={category}
                onClick={() => setActiveTab(category as SystemSettingCategory)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {getSettingsByCategory(category as SystemSettingCategory).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          <SettingsCard
            category={activeTab}
            settings={getSettingsByCategory(activeTab)}
            onUpdate={handleSettingUpdate}
            onReset={handleSettingReset}
          />
        </div>
      </div>
    </div>
  );
}