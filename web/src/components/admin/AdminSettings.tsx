import React, { useState } from 'react';
import { 
  CogIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Setting {
  id: string;
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'currency';
  description: string;
  category: string;
  editable: boolean;
  lastModified?: Date;
  modifiedBy?: string;
}

interface AdminSettingsProps {
  settings: Setting[];
  loading?: boolean;
  onUpdateSetting?: (settingId: string, newValue: string | number | boolean) => Promise<void>;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  loading = false,
  onUpdateSetting
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(settings.map(s => s.category)))];

  const filteredSettings = settings.filter(setting => {
    const matchesSearch = setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedSettings = filteredSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  const startEditing = (setting: Setting) => {
    setEditingId(setting.id);
    setEditValue(String(setting.value));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (setting: Setting) => {
    if (!onUpdateSetting) return;

    setSaving(setting.id);
    try {
      let newValue: string | number | boolean = editValue;
      
      if (setting.type === 'number' || setting.type === 'currency') {
        newValue = parseFloat(editValue);
      } else if (setting.type === 'boolean') {
        newValue = editValue.toLowerCase() === 'true';
      }

      await onUpdateSetting(setting.id, newValue);
      setEditingId(null);
      setEditValue('');
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setSaving(null);
    }
  };

  const formatValue = (setting: Setting) => {
    if (setting.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(setting.value));
    } else if (setting.type === 'boolean') {
      return setting.value ? 'Enabled' : 'Disabled';
    }
    return String(setting.value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <CogIcon className="w-6 h-6 mr-2 text-gray-500" />
            System Settings
          </h2>
        </div>
        
        {/* Search and Filter */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {Object.keys(groupedSettings).length === 0 ? (
          <div className="text-center py-8">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No settings found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSettings).map(([category, categorySettings]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                  {category}
                </h3>
                <div className="space-y-4">
                  {categorySettings.map((setting) => (
                    <div key={setting.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {setting.key}
                            </h4>
                            {!setting.editable && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Read-only
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {setting.description}
                          </p>
                          
                          {/* Value Display/Edit */}
                          <div className="mt-2">
                            {editingId === setting.id ? (
                              <div className="flex items-center space-x-2">
                                {setting.type === 'boolean' ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                  </select>
                                ) : (
                                  <input
                                    type={setting.type === 'number' || setting.type === 'currency' ? 'number' : 'text'}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step={setting.type === 'currency' ? '0.01' : undefined}
                                  />
                                )}
                                <button
                                  onClick={() => saveEdit(setting)}
                                  disabled={saving === setting.id}
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                >
                                  <CheckIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving === setting.id}
                                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${
                                  setting.type === 'boolean' 
                                    ? setting.value 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                    : 'text-gray-900'
                                }`}>
                                  {formatValue(setting)}
                                </span>
                                {setting.editable && onUpdateSetting && (
                                  <button
                                    onClick={() => startEditing(setting)}
                                    className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Last Modified Info */}
                          {setting.lastModified && (
                            <div className="mt-2 text-xs text-gray-500">
                              Last modified: {formatDate(setting.lastModified)}
                              {setting.modifiedBy && ` by ${setting.modifiedBy}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warning Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Modifying system settings can affect the entire application. Please ensure you understand 
                the implications before making changes. Some settings may require application restart to take effect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;