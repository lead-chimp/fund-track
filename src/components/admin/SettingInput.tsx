'use client';

import { useState, useEffect } from 'react';
import { SystemSetting, SystemSettingType } from '@prisma/client';

interface SettingInputProps {
  setting: SystemSetting;
  onUpdate: (value: string) => void;
  isUpdating: boolean;
  error?: string;
}

export function SettingInput({ setting, onUpdate, isUpdating, error }: SettingInputProps) {
  const [value, setValue] = useState(setting.value);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setValue(setting.value);
    setHasChanges(false);
  }, [setting.value]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setHasChanges(newValue !== setting.value);
  };

  const handleSave = () => {
    if (hasChanges && !isUpdating) {
      onUpdate(value);
      setHasChanges(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges && !isUpdating) {
      handleSave();
    }
  };

  const renderInput = () => {
    switch (setting.type) {
      case SystemSettingType.BOOLEAN:
        return (
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value.toLowerCase() === 'true'}
                onChange={(e) => handleChange(e.target.checked ? 'true' : 'false')}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700">
              {value.toLowerCase() === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case SystemSettingType.NUMBER:
        return (
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isUpdating}
              className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        );

      case SystemSettingType.JSON:
        return (
          <div className="space-y-3">
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={isUpdating}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
              placeholder="Enter valid JSON..."
            />
            {hasChanges && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(value), null, 2);
                      handleChange(formatted);
                    } catch (e) {
                      // Invalid JSON, don't format
                    }
                  }}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Format JSON
                </button>
              </div>
            )}
          </div>
        );

      case SystemSettingType.STRING:
      default:
        return (
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isUpdating}
              className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderInput()}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}