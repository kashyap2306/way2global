import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';

interface SimplifiedPlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  withdrawal: {
    minAmount: number;
    withdrawalFee: number;
    minDirectReferrals: number;
  };
  referrals: {
    requiredForClaiming: number;
    maxLevels: number;
  };
}

const defaultSettings: SimplifiedPlatformSettings = {
  general: {
    platformName: 'Way2Globle Wave',
    supportEmail: 'support@way2globlewave.com',
    maintenanceMode: false
  },
  withdrawal: {
    minAmount: 50,
    withdrawalFee: 15,
    minDirectReferrals: 2
  },
  referrals: {
    requiredForClaiming: 2,
    maxLevels: 10
  }
};

const PlatformSettings: React.FC = () => {
  const { userData } = useAuth();
  const [settings, setSettings] = useState<SimplifiedPlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(defaultSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          general: data.general || defaultSettings.general,
          withdrawal: data.withdrawal || defaultSettings.withdrawal,
          referrals: data.referrals || defaultSettings.referrals
        });
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'platform'), settings, { merge: true });
      
      // Log the settings update
      await auditService.logSettingsUpdate(
        userData?.uid || '',
        userData?.email || '',
        'platform_settings',
        'Platform settings updated',
        { updatedSettings: settings }
      );

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateGeneralSetting = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value
      }
    }));
  };

  const updateWithdrawalSetting = (field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      withdrawal: {
        ...prev.withdrawal,
        [field]: value
      }
    }));
  };

  const updateReferralSetting = (field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      referrals: {
        ...prev.referrals,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Platform Settings</h1>
              <p className="text-gray-300">Essential platform configuration</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {lastSaved && (
                <div className="flex items-center text-sm text-gray-400">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              {hasUnsavedChanges && (
                <div className="flex items-center text-sm text-yellow-400">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Unsaved changes
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={fetchSettings}
                  disabled={loading}
                  className="flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                <button
                  onClick={saveSettings}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <InformationCircleIcon className="h-6 w-6 text-blue-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">General Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.general.platformName}
                  onChange={(e) => updateGeneralSetting('platformName', e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter platform name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.general.supportEmail}
                  onChange={(e) => updateGeneralSetting('supportEmail', e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="support@example.com"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maintenance Mode
                </label>
                <select
                  value={settings.general.maintenanceMode.toString()}
                  onChange={(e) => updateGeneralSetting('maintenanceMode', e.target.value === 'true')}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
                {settings.general.maintenanceMode && (
                  <div className="mt-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-yellow-200 text-sm">
                        Maintenance mode is active. Users will see a maintenance message.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Withdrawal Settings */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-6 w-6 text-green-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Withdrawal Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Amount ($)
                </label>
                <input
                  type="number"
                  value={settings.withdrawal.minAmount}
                  onChange={(e) => updateWithdrawalSetting('minAmount', Number(e.target.value))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="50"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Withdrawal Fee ($)
                </label>
                <input
                  type="number"
                  value={settings.withdrawal.withdrawalFee}
                  onChange={(e) => updateWithdrawalSetting('withdrawalFee', Number(e.target.value))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="15"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Direct Referrals
                </label>
                <input
                  type="number"
                  value={settings.withdrawal.minDirectReferrals}
                  onChange={(e) => updateWithdrawalSetting('minDirectReferrals', Number(e.target.value))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="2"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Referral System Settings */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <UserGroupIcon className="h-6 w-6 text-purple-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Referral System</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Required Referrals for Pool Income
                </label>
                <input
                  type="number"
                  value={settings.referrals.requiredForClaiming}
                  onChange={(e) => updateReferralSetting('requiredForClaiming', Number(e.target.value))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="2"
                  min="1"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Minimum direct referrals needed to claim global income
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Referral Levels
                </label>
                <input
                  type="number"
                  value={settings.referrals.maxLevels}
                  onChange={(e) => updateReferralSetting('maxLevels', Number(e.target.value))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="10"
                  min="1"
                  max="20"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Maximum depth for referral tracking
                </p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <ShieldCheckIcon className="h-6 w-6 text-purple-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">System Status</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                  <div>
                    <p className="text-green-300 font-medium">Database</p>
                    <p className="text-green-200 text-sm">Connected</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                  <div>
                    <p className="text-green-300 font-medium">API</p>
                    <p className="text-green-200 text-sm">Operational</p>
                  </div>
                </div>
              </div>
              
              <div className={`${settings.general.maintenanceMode ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-green-500/20 border-green-500/30'} rounded-lg p-4`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 ${settings.general.maintenanceMode ? 'bg-yellow-400' : 'bg-green-400'} rounded-full mr-3`}></div>
                  <div>
                    <p className={`${settings.general.maintenanceMode ? 'text-yellow-300' : 'text-green-300'} font-medium`}>Platform</p>
                    <p className={`${settings.general.maintenanceMode ? 'text-yellow-200' : 'text-green-200'} text-sm`}>
                      {settings.general.maintenanceMode ? 'Maintenance' : 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;