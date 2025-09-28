import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';

interface PlatformSettings {
  ranks: {
    [key: string]: {
      name: string;
      topupAmount: number;
      incomePercentage: number;
      directReferralBonus: number;
      levelIncomePercentages: number[];
    };
  };
  withdrawal: {
    minAmount: number;
    withdrawalFee: number;
    fundConvertFee: number;
    minDirectReferrals: number;
  };
  globalIncome: {
    poolSizes: {
      [key: string]: number;
    };
    autoRankUpgrade: boolean;
    distributionPercentage: number;
  };
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
}

const defaultSettings: PlatformSettings = {
  ranks: {
    Bronze: {
      name: 'Bronze',
      topupAmount: 100,
      incomePercentage: 10,
      directReferralBonus: 10,
      levelIncomePercentages: [10, 5, 3, 2, 1]
    },
    Silver: {
      name: 'Silver',
      topupAmount: 500,
      incomePercentage: 12,
      directReferralBonus: 15,
      levelIncomePercentages: [12, 6, 4, 3, 2]
    },
    Gold: {
      name: 'Gold',
      topupAmount: 1000,
      incomePercentage: 15,
      directReferralBonus: 20,
      levelIncomePercentages: [15, 8, 5, 4, 3]
    },
    Platinum: {
      name: 'Platinum',
      topupAmount: 2500,
      incomePercentage: 18,
      directReferralBonus: 25,
      levelIncomePercentages: [18, 10, 6, 5, 4]
    },
    Diamond: {
      name: 'Diamond',
      topupAmount: 5000,
      incomePercentage: 20,
      directReferralBonus: 30,
      levelIncomePercentages: [20, 12, 8, 6, 5]
    }
  },
  withdrawal: {
    minAmount: 50,
    withdrawalFee: 15,
    fundConvertFee: 10,
    minDirectReferrals: 2
  },
  globalIncome: {
    poolSizes: {
      Bronze: 1000,
      Silver: 2500,
      Gold: 5000,
      Platinum: 10000,
      Diamond: 25000
    },
    autoRankUpgrade: true,
    distributionPercentage: 80
  },
  general: {
    platformName: 'Way2Globle Wave',
    supportEmail: 'support@way2globlewave.com',
    maintenanceMode: false
  }
};

const AdminSettings: React.FC = () => {
  const { userData } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ranks');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'platform'), settings);
      
      // Log audit trail
      await setDoc(doc(db, 'auditLogs', Date.now().toString()), {
        action: 'UPDATE_SETTINGS',
        adminId: userData!.uid,
        adminEmail: userData!.email,
        timestamp: new Date(),
        details: 'Platform settings updated'
      });

      // Log settings update
      await auditService.logSettingsUpdate(
        userData!.uid,
        userData!.email,
        'platform_settings',
        defaultSettings,
        settings
      );

      setShowSaveConfirm(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateRankSetting = (rank: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      ranks: {
        ...prev.ranks,
        [rank]: {
          ...prev.ranks[rank],
          [field]: value
        }
      }
    }));
  };

  const updateLevelIncome = (rank: string, levelIndex: number, value: number) => {
    setSettings(prev => ({
      ...prev,
      ranks: {
        ...prev.ranks,
        [rank]: {
          ...prev.ranks[rank],
          levelIncomePercentages: prev.ranks[rank].levelIncomePercentages.map((percentage, index) =>
            index === levelIndex ? value : percentage
          )
        }
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

  const updateGlobalIncomeSetting = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      globalIncome: {
        ...prev.globalIncome,
        [field]: value
      }
    }));
  };

  const updatePoolSize = (rank: string, size: number) => {
    setSettings(prev => ({
      ...prev,
      globalIncome: {
        ...prev.globalIncome,
        poolSizes: {
          ...prev.globalIncome.poolSizes,
          [rank]: size
        }
      }
    }));
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Platform Settings</h1>
          <p className="text-gray-300">Configure platform rules and parameters</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-6">
          <div className="flex space-x-1 p-1">
            {[
              { id: 'ranks', name: 'Ranks & Income', icon: ChartBarIcon },
              { id: 'withdrawal', name: 'Withdrawal Rules', icon: CurrencyDollarIcon },
              { id: 'globalIncome', name: 'Global Income', icon: UserGroupIcon },
              { id: 'general', name: 'General', icon: CogIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          {/* Ranks & Income Tab */}
          {activeTab === 'ranks' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Rank Configuration</h2>
              
              {Object.entries(settings.ranks).map(([rankKey, rank]) => (
                <div key={rankKey} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-4">{rank.name} Rank</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Topup Amount ($)
                      </label>
                      <input
                        type="number"
                        value={rank.topupAmount}
                        onChange={(e) => updateRankSetting(rankKey, 'topupAmount', Number(e.target.value))}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Income Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={rank.incomePercentage}
                        onChange={(e) => updateRankSetting(rankKey, 'incomePercentage', Number(e.target.value))}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Direct Referral Bonus ($)
                      </label>
                      <input
                        type="number"
                        value={rank.directReferralBonus}
                        onChange={(e) => updateRankSetting(rankKey, 'directReferralBonus', Number(e.target.value))}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Level Income Percentages (%)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {rank.levelIncomePercentages.map((percentage, index) => (
                        <div key={index}>
                          <label className="block text-xs text-gray-400 mb-1">Level {index + 1}</label>
                          <input
                            type="number"
                            value={percentage}
                            onChange={(e) => updateLevelIncome(rankKey, index, Number(e.target.value))}
                            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Withdrawal Rules Tab */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Withdrawal Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Withdrawal Amount ($)
                  </label>
                  <input
                    type="number"
                    value={settings.withdrawal.minAmount}
                    onChange={(e) => updateWithdrawalSetting('minAmount', Number(e.target.value))}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Withdrawal Fee (%)
                  </label>
                  <input
                    type="number"
                    value={settings.withdrawal.withdrawalFee}
                    onChange={(e) => updateWithdrawalSetting('withdrawalFee', Number(e.target.value))}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fund Convert Fee (%)
                  </label>
                  <input
                    type="number"
                    value={settings.withdrawal.fundConvertFee}
                    onChange={(e) => updateWithdrawalSetting('fundConvertFee', Number(e.target.value))}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Direct Referrals Required
                  </label>
                  <input
                    type="number"
                    value={settings.withdrawal.minDirectReferrals}
                    onChange={(e) => updateWithdrawalSetting('minDirectReferrals', Number(e.target.value))}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Global Income Tab */}
          {activeTab === 'globalIncome' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Global Income Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Distribution Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={settings.globalIncome.distributionPercentage}
                    onChange={(e) => updateGlobalIncomeSetting('distributionPercentage', Number(e.target.value))}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Auto Rank Upgrade
                  </label>
                  <select
                    value={settings.globalIncome.autoRankUpgrade.toString()}
                    onChange={(e) => updateGlobalIncomeSetting('autoRankUpgrade', e.target.value === 'true')}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Pool Sizes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(settings.globalIncome.poolSizes).map(([rank, size]) => (
                    <div key={rank}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {rank} Pool ($)
                      </label>
                      <input
                        type="number"
                        value={size}
                        onChange={(e) => updatePoolSize(rank, Number(e.target.value))}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.platformName}
                    onChange={(e) => updateGeneralSetting('platformName', e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maintenance Mode
                  </label>
                  <select
                    value={settings.general.maintenanceMode.toString()}
                    onChange={(e) => updateGeneralSetting('maintenanceMode', e.target.value === 'true')}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
              </div>
              
              {settings.general.maintenanceMode && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 text-sm font-medium">Maintenance Mode Active</p>
                      <p className="text-yellow-200 text-xs mt-1">
                        Users will see a maintenance message and won't be able to access the platform.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowSaveConfirm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>

        {/* Save Confirmation Modal */}
        {showSaveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Confirm Settings Update</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to save these settings? This will affect all users on the platform.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSaveConfirm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;