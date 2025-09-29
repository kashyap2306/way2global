import React, { useState } from 'react';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  CogIcon,
  ChartBarIcon,
  GiftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const TestNewSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'global-income' | 'wallet' | 'admin'>('overview');

  const mockUserData = {
    userCode: 'WG123456',
    displayName: 'John Doe',
    availableBalance: 1250.75,
    lockedBalance: 850.25,
    directReferralsCount: 3,
    rankActivations: {
      azurite: { isActive: true, activatedAt: new Date(), poolId: 'pool1' },
      pearl: { isActive: true, activatedAt: new Date(), poolId: 'pool2' }
    }
  };

  const mockIncomePools = [
    {
      id: 'pool1',
      rank: 'azurite',
      poolIncome: 125.50,
      maxPoolIncome: 500,
      isLocked: false,
      canClaim: true,
      directReferralsCount: 3,
      requiredDirectReferrals: 2,
      activatedAt: new Date(),
      metadata: { activationAmount: 5 }
    },
    {
      id: 'pool2',
      rank: 'pearl',
      poolIncome: 75.25,
      maxPoolIncome: 2500,
      isLocked: true,
      canClaim: false,
      directReferralsCount: 3,
      requiredDirectReferrals: 2,
      activatedAt: new Date(),
      metadata: { activationAmount: 25 }
    }
  ];

  const mockPlatformSettings = {
    directReferralRequirement: 2,
    maintenanceMode: false,
    registrationOpen: true,
    welcomeBonus: 10,
    maxRankLevel: 10
  };

  const tabs = [
    { id: 'overview', name: 'System Overview', icon: ChartBarIcon },
    { id: 'global-income', name: 'Global Income', icon: CurrencyDollarIcon },
    { id: 'wallet', name: 'Wallet', icon: UserGroupIcon },
    { id: 'admin', name: 'Admin Settings', icon: CogIcon }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">New MLM System Overview</h2>
        <p className="text-gray-300 text-lg">
          User-centric, pool-based income system without Re-ID and Auto TopUp
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Re-ID Removed</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Eliminated complex Re-ID generation and management system
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Auto TopUp Removed</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Simplified system without automatic top-up mechanisms
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Pool-Based Income</h3>
          </div>
          <p className="text-gray-300 text-sm">
            User-centric income pools with 100x activation multiplier
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UserGroupIcon className="w-8 h-8 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Direct Referral Req</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Configurable direct referral requirement for income claims
          </p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-lg font-medium text-purple-400">Income Pools</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Per-rank income accumulation</li>
              <li>• 100x activation amount as max pool income</li>
              <li>• Direct referral requirement enforcement</li>
              <li>• Locked/unlocked status management</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-medium text-blue-400">Wallet System</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Separate available and locked balances</li>
              <li>• Real-time balance updates</li>
              <li>• Transaction history tracking</li>
              <li>• Claimable income display</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGlobalIncome = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <CurrencyDollarIcon className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Global Income Pools</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockIncomePools.map((pool) => (
          <div key={pool.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white capitalize">{pool.rank} Pool</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                pool.canClaim 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}>
                {pool.canClaim ? 'Claimable' : 'Locked'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Pool Income</span>
                  <span>${pool.poolIncome.toFixed(2)} / ${pool.maxPoolIncome.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(pool.poolIncome / pool.maxPoolIncome) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Direct Referrals:</span>
                  <p className="text-white font-medium">
                    {pool.directReferralsCount} / {pool.requiredDirectReferrals}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Activation:</span>
                  <p className="text-white font-medium">${pool.metadata.activationAmount}</p>
                </div>
              </div>

              <button
                disabled={!pool.canClaim}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  pool.canClaim
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {pool.canClaim ? `Claim $${pool.poolIncome.toFixed(2)}` : 'Cannot Claim Yet'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <UserGroupIcon className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Wallet Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Available Balance</h3>
          </div>
          <p className="text-3xl font-bold text-white">${mockUserData.availableBalance.toFixed(2)}</p>
          <p className="text-green-300 text-sm mt-2">Ready for withdrawal or rank activation</p>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <GiftIcon className="w-8 h-8 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Locked Balance</h3>
          </div>
          <p className="text-3xl font-bold text-white">${mockUserData.lockedBalance.toFixed(2)}</p>
          <p className="text-yellow-300 text-sm mt-2">Income accumulating in pools</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">User Code:</span>
            <p className="text-white font-mono font-medium">{mockUserData.userCode}</p>
          </div>
          <div>
            <span className="text-gray-400">Direct Referrals:</span>
            <p className="text-white font-medium">{mockUserData.directReferralsCount}</p>
          </div>
          <div>
            <span className="text-gray-400">Active Ranks:</span>
            <p className="text-white font-medium">
              {Object.keys(mockUserData.rankActivations).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <CogIcon className="w-8 h-8 text-orange-400" />
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Current Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Direct Referral Requirement
              </label>
              <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                <span className="text-white font-medium">{mockPlatformSettings.directReferralRequirement}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Welcome Bonus
              </label>
              <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                <span className="text-white font-medium">${mockPlatformSettings.welcomeBonus}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Status
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Maintenance Mode:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    mockPlatformSettings.maintenanceMode
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {mockPlatformSettings.maintenanceMode ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Registration:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    mockPlatformSettings.registrationOpen
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {mockPlatformSettings.registrationOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-blue-300 mb-3">System Changes Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-white mb-2">Removed Features:</h5>
            <ul className="text-blue-200 space-y-1">
              <li>• Re-ID generation and management</li>
              <li>• Auto TopUp mechanisms</li>
              <li>• Complex MLM tree structures</li>
              <li>• Re-topup income calculations</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-white mb-2">New Features:</h5>
            <ul className="text-blue-200 space-y-1">
              <li>• User-centric income pools</li>
              <li>• Configurable direct referral requirements</li>
              <li>• Separate available/locked balances</li>
              <li>• Platform-wide settings management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-2 mb-8">
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-black/10 backdrop-blur-sm border border-white/5 rounded-xl p-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'global-income' && renderGlobalIncome()}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'admin' && renderAdmin()}
        </div>
      </div>
    </div>
  );
};

export default TestNewSystem;