import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ShieldCheckIcon
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  // Track changes to show unsaved indicator
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
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
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Platform Settings</h1>
              <p className="text-gray-300">Configure platform rules and parameters</p>
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
              
              <button
                onClick={fetchSettings}
                disabled={loading}
                className="flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 p-1 min-w-full sm:min-w-0">
              {[
                { id: 'ranks', name: 'Ranks & Income', icon: ChartBarIcon, color: 'text-blue-400' },
                { id: 'withdrawal', name: 'Withdrawal Rules', icon: CurrencyDollarIcon, color: 'text-green-400' },
                { id: 'globalIncome', name: 'Global Income', icon: UserGroupIcon, color: 'text-purple-400' },
                { id: 'general', name: 'General', icon: CogIcon, color: 'text-orange-400' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          {/* Ranks & Income Tab */}
          {activeTab === 'ranks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Rank Configuration</h2>
                <div className="flex items-center text-sm text-gray-400">
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  Configure rank requirements and rewards
                </div>
              </div>
              
              {Object.entries(settings.ranks).map(([rankKey, rank]) => {
                const sectionId = `rank-${rankKey}`;
                const isExpanded = expandedSections[sectionId] !== false; // Default to expanded
                
                return (
                  <div key={rankKey} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <button
                      onClick={() => toggleSection(sectionId)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center">
                        <ChartBarIcon className="h-5 w-5 text-blue-400 mr-3" />
                        <h3 className="text-lg font-medium text-white">{rank.name} Rank</h3>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Topup Amount ($)
                            </label>
                            <input
                              type="number"
                              value={rank.topupAmount}
                              onChange={(e) => updateRankSetting(rankKey, 'topupAmount', Number(e.target.value))}
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Level Income Percentages (%)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Withdrawal Rules Tab */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Withdrawal Configuration</h2>
                <div className="flex items-center text-sm text-gray-400">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  Set withdrawal limits and fees
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-400 mr-2" />
                      Amount Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Minimum Withdrawal Amount ($)
                        </label>
                        <input
                          type="number"
                          value={settings.withdrawal.minAmount}
                          onChange={(e) => updateWithdrawalSetting('minAmount', Number(e.target.value))}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter minimum amount"
                        />
                        <p className="text-xs text-gray-400 mt-1">Users must withdraw at least this amount</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                      <UserGroupIcon className="h-5 w-5 text-purple-400 mr-2" />
                      Requirements
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Direct Referrals Required
                      </label>
                      <input
                        type="number"
                        value={settings.withdrawal.minDirectReferrals}
                        onChange={(e) => updateWithdrawalSetting('minDirectReferrals', Number(e.target.value))}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter minimum referrals"
                      />
                      <p className="text-xs text-gray-400 mt-1">Users need this many direct referrals to withdraw</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                      <CogIcon className="h-5 w-5 text-orange-400 mr-2" />
                      Fee Structure
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Withdrawal Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.withdrawal.withdrawalFee}
                          onChange={(e) => updateWithdrawalSetting('withdrawalFee', Number(e.target.value))}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter fee percentage"
                        />
                        <p className="text-xs text-gray-400 mt-1">Fee charged on withdrawal amount</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Fund Convert Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.withdrawal.fundConvertFee}
                          onChange={(e) => updateWithdrawalSetting('fundConvertFee', Number(e.target.value))}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter conversion fee"
                        />
                        <p className="text-xs text-gray-400 mt-1">Fee for converting funds to withdrawable balance</p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                      <InformationCircleIcon className="h-4 w-4 mr-2" />
                      Example Calculation
                    </h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Withdrawal Amount: $100</div>
                      <div>Withdrawal Fee ({settings.withdrawal.withdrawalFee}%): ${(100 * settings.withdrawal.withdrawalFee / 100).toFixed(2)}</div>
                      <div className="border-t border-white/20 pt-1 font-medium text-white">
                        Net Amount: ${(100 - (100 * settings.withdrawal.withdrawalFee / 100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Global Income Tab */}
          {activeTab === 'globalIncome' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Global Income Configuration</h2>
                <div className="flex items-center text-sm text-gray-400">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  Configure global income distribution
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-blue-400 mr-2" />
                    Distribution Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Distribution Percentage (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.globalIncome.distributionPercentage}
                        onChange={(e) => updateGlobalIncomeSetting('distributionPercentage', Number(e.target.value))}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter distribution percentage"
                      />
                      <p className="text-xs text-gray-400 mt-1">Percentage of total income distributed globally</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                    <CogIcon className="h-5 w-5 text-orange-400 mr-2" />
                    Auto Features
                  </h3>
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
                    <p className="text-xs text-gray-400 mt-1">Automatically upgrade users when they meet rank requirements</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-400 mr-2" />
                  Pool Sizes Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(settings.globalIncome.poolSizes).map(([rank, size]) => (
                    <div key={rank} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                        {rank} Pool
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={size}
                          onChange={(e) => updatePoolSize(rank, Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Pool size for {rank} rank</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">General Settings</h2>
                <div className="flex items-center text-sm text-gray-400">
                  <CogIcon className="h-4 w-4 mr-1" />
                  Platform-wide configuration
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
                      Platform Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Platform Name
                        </label>
                        <input
                          type="text"
                          value={settings.general.platformName}
                          onChange={(e) => updateGeneralSetting('platformName', e.target.value)}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter platform name"
                        />
                        <p className="text-xs text-gray-400 mt-1">Display name for your platform</p>
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
                          placeholder="support@example.com"
                        />
                        <p className="text-xs text-gray-400 mt-1">Contact email for user support</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-orange-400 mr-2" />
                      System Control
                    </h3>
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
                      <p className="text-xs text-gray-400 mt-1">Enable to prevent user access during maintenance</p>
                    </div>
                  </div>

                  {settings.general.maintenanceMode && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-yellow-300 text-sm font-medium mb-1">Maintenance Mode Active</p>
                          <p className="text-yellow-200 text-xs">
                            Users will see a maintenance message and won't be able to access the platform. 
                            Make sure to disable this when maintenance is complete.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pt-6 pb-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center text-sm text-gray-400">
              {hasUnsavedChanges ? (
                <div className="flex items-center text-yellow-400">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  You have unsaved changes
                </div>
              ) : (
                <div className="flex items-center text-green-400">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  All changes saved
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => setShowSaveConfirm(true)}
                disabled={saving || !hasUnsavedChanges}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save Confirmation Modal */}
        {showSaveConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10 shadow-2xl">
              <div className="flex items-center mb-4">
                <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                  <CheckCircleIcon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Confirm Settings Update</h3>
              </div>
              
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Are you sure you want to save these platform settings? This will update the configuration 
                for all users and may affect platform behavior immediately.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowSaveConfirm(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      Confirm Save
                    </>
                  )}
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