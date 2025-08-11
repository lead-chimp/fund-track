'use client';

import { useState } from 'react';
import { SystemSetting, SystemSettingType, SystemSettingCategory } from '@prisma/client';
import { SettingInput } from './SettingInput';

interface SettingsCardProps {
  category: SystemSettingCategory;
  settings: SystemSetting[];
  onUpdate: (key: string, value: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
}

const CATEGORY_DESCRIPTIONS = {
  [SystemSettingCategory.NOTIFICATIONS]: 'Configure email and SMS notification settings',
};

export function SettingsCard({ category, settings, onUpdate, onReset }: SettingsCardProps) {
  const [updatingSettings, setUpdatingSettings] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = async (key: string, value: string) => {
    setUpdatingSettings(prev => new Set(prev).add(key));
    setErrors(prev => ({ ...prev, [key]: '' }));

    try {
      await onUpdate(key, value);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [key]: error instanceof Error ? error.message : 'Failed to update setting'
      }));
    } finally {
      setUpdatingSettings(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleReset = async (key: string) => {
    setUpdatingSettings(prev => new Set(prev).add(key));
    setErrors(prev => ({ ...prev, [key]: '' }));

    try {
      await onReset(key);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [key]: error instanceof Error ? error.message : 'Failed to reset setting'
      }));
    } finally {
      setUpdatingSettings(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  if (settings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          <p>No settings found for this category.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {CATEGORY_DESCRIPTIONS[category]}
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.key} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {setting.type.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {setting.description}
                  </p>
                  
                  <SettingInput
                    setting={setting}
                    onUpdate={(value) => handleUpdate(setting.key, value)}
                    isUpdating={updatingSettings.has(setting.key)}
                    error={errors[setting.key]}
                  />

                  {errors[setting.key] && (
                    <div className="mt-2 text-sm text-red-600">
                      {errors[setting.key]}
                    </div>
                  )}

                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Default: {setting.defaultValue}</span>
                    {setting.updatedAt && (
                      <span>
                        Last updated: {new Date(setting.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleReset(setting.key)}
                    disabled={updatingSettings.has(setting.key)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingSettings.has(setting.key) ? 'Resetting...' : 'Reset'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}