import React, { useState, useEffect } from 'react';
import { 
  BanknotesIcon, 
  ClockIcon, 
  WalletIcon,
  CheckCircleIcon,
  LockClosedIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  UserIcon,
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

// Interfaces

interface RankData {
  name: string;
  minAmount: number;
  globalIncomePercentage: number;
  color: string;
  levels: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  rank: string;
  level: number;
  totalEarnings: number;
  walletAmount: number;
  directReferrals: number;
  rankEarnings: { [key: string]: number };
  levelEarnings: { [key: string]: number };
  lockedAmount: number;
  availableAmount: number;
  status: 'active' | 'inactive';
  joinedAt: any;
}

interface SelectedUser extends UserData {
  processingAmount: number;
  referralContributions: number;
}

interface SummaryCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
}

const GlobalIncomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Partial<UserData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRank, setFilterRank] = useState('all');

  // Correct 10 Gemstone Rank Names (Azurite → Jeremejevite)
  const rankDefinitions: RankData[] = [
    { name: 'Azurite', minAmount: 100, globalIncomePercentage: 1, color: 'from-blue-600 to-blue-800', levels: 10 },
    { name: 'Beryl', minAmount: 500, globalIncomePercentage: 2, color: 'from-green-600 to-green-800', levels: 10 },
    { name: 'Citrine', minAmount: 1000, globalIncomePercentage: 3, color: 'from-yellow-600 to-yellow-800', levels: 10 },
    { name: 'Diamond', minAmount: 2500, globalIncomePercentage: 4, color: 'from-gray-400 to-gray-600', levels: 10 },
    { name: 'Emerald', minAmount: 5000, globalIncomePercentage: 5, color: 'from-emerald-600 to-emerald-800', levels: 10 },
    { name: 'Fluorite', minAmount: 10000, globalIncomePercentage: 6, color: 'from-purple-600 to-purple-800', levels: 10 },
    { name: 'Garnet', minAmount: 20000, globalIncomePercentage: 7, color: 'from-red-600 to-red-800', levels: 10 },
    { name: 'Hematite', minAmount: 40000, globalIncomePercentage: 8, color: 'from-gray-700 to-gray-900', levels: 10 },
    { name: 'Iolite', minAmount: 80000, globalIncomePercentage: 9, color: 'from-indigo-600 to-indigo-800', levels: 10 },
    { name: 'Jeremejevite', minAmount: 160000, globalIncomePercentage: 10, color: 'from-pink-600 to-pink-800', levels: 10 }
  ];

  // Mock data for demonstration
  const mockUsers: UserData[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      rank: 'Diamond',
      level: 5,
      totalEarnings: 15000,
      walletAmount: 2500,
      directReferrals: 8,
      rankEarnings: { 'Diamond': 12000, 'Emerald': 3000 },
      levelEarnings: { '1': 1000, '2': 1500, '3': 2000, '4': 2500, '5': 3000 },
      lockedAmount: 5000,
      availableAmount: 10000,
      status: 'active',
      joinedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      rank: 'Emerald',
      level: 7,
      totalEarnings: 25000,
      walletAmount: 4200,
      directReferrals: 12,
      rankEarnings: { 'Emerald': 20000, 'Fluorite': 5000 },
      levelEarnings: { '1': 1500, '2': 2000, '3': 2500, '4': 3000, '5': 3500, '6': 4000, '7': 4500 },
      lockedAmount: 8000,
      availableAmount: 17000,
      status: 'active',
      joinedAt: new Date('2024-02-10')
    }
  ];

  // Summary cards data
  const summaryCards: SummaryCard[] = [
    {
      title: 'Total Global Income',
      value: '$125,450.00',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'BanknotesIcon',
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Pending Amount',
      value: '$0.00',
      change: '0%',
      changeType: 'neutral',
      icon: 'ClockIcon',
      color: 'from-yellow-500 to-amber-600'
    },
    {
      title: 'Processing Amount',
      value: '$8,750.00',
      change: '+5.2%',
      changeType: 'positive',
      icon: 'ChartBarIcon',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Wallet Amount',
      value: '$6,700.00',
      change: '+8.1%',
      changeType: 'positive',
      icon: 'WalletIcon',
      color: 'from-purple-500 to-violet-600'
    }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Set mock data for demonstration
      setUsers(mockUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      BanknotesIcon,
      ClockIcon,
      ChartBarIcon,
      WalletIcon
    };
    const IconComponent = icons[iconName] || BanknotesIcon;
    return <IconComponent className="w-6 h-6" />;
  };

  const handleUserClick = (user: UserData) => {
    const processingAmount = Object.values(user.rankEarnings).reduce((sum, amount) => sum + amount, 0);
    const selectedUserData: SelectedUser = {
      ...user,
      processingAmount,
      referralContributions: user.directReferrals * 500 // Mock calculation
    };
    setSelectedUser(selectedUserData);
    setEditValues(selectedUserData);
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || !editValues) return;
    
    try {
      // Update user data (mock implementation)
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id ? { ...user, ...editValues } : user
      );
      setUsers(updatedUsers);
      
      // Update selected user
      setSelectedUser({ ...selectedUser, ...editValues } as SelectedUser);
      setEditMode(false);
      
      // In real implementation, update Firestore
      // await updateDoc(doc(db, 'users', selectedUser.id), editValues);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const isLevelUnlocked = (rank: string, level: number, userEarnings: number): boolean => {
    const rankData = rankDefinitions.find(r => r.name === rank);
    if (!rankData) return false;
    
    const requiredAmount = rankData.minAmount * level;
    return userEarnings >= requiredAmount;
  };

  const canClaimWallet = (directReferrals: number): boolean => {
    return directReferrals >= 2;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = filterRank === 'all' || user.rank === filterRank;
    return matchesSearch && matchesRank;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Global Income Dashboard
          </h1>
          <p className="text-blue-200">Monitor and manage global income distribution across all ranks and levels</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-black/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                  {getIconComponent(card.icon)}
                </div>
                <div className={`text-sm font-medium ${
                  card.changeType === 'positive' ? 'text-green-400' : 
                  card.changeType === 'negative' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {card.change}
                </div>
              </div>
              <h3 className="text-gray-300 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value)}
              className="px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Ranks</option>
              {rankDefinitions.map(rank => (
                <option key={rank.name} value={rank.name}>{rank.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rank & Level Table */}
        <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden mb-8">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrophyIcon className="w-6 h-6 text-yellow-400" />
              Rank & Level Overview
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Total Earnings</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Wallet</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Referrals</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => {
                  const rankData = rankDefinitions.find(r => r.name === user.rank);
                  const levelUnlocked = isLevelUnlocked(user.rank, user.level, user.totalEarnings);
                  const walletClaimable = canClaimWallet(user.directReferrals);
                  
                  return (
                    <tr 
                      key={user.id} 
                      className="hover:bg-white/5 cursor-pointer transition-colors duration-200"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${rankData?.color || 'from-gray-500 to-gray-700'} text-white`}>
                          {user.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-white font-medium mr-2">{user.level}</span>
                          {levelUnlocked ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <LockClosedIcon className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {formatCurrency(user.totalEarnings)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-white font-medium mr-2">
                            {formatCurrency(user.walletAmount)}
                          </span>
                          {walletClaimable ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <LockClosedIcon className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {user.directReferrals}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-900/50 text-green-300 border border-green-500/30' 
                            : 'bg-red-900/50 text-red-300 border border-red-500/30'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-blue-900/90 to-black/90 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">User Details</h2>
                <div className="flex gap-2">
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Info */}
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-300 text-sm">Name</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editValues.name || ''}
                          onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white"
                        />
                      ) : (
                        <p className="text-white font-medium">{selectedUser.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Email</label>
                      <p className="text-white font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Rank</label>
                      {editMode ? (
                        <select
                          value={editValues.rank || selectedUser.rank}
                          onChange={(e) => setEditValues({...editValues, rank: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white"
                        >
                          {rankDefinitions.map(rank => (
                            <option key={rank.name} value={rank.name}>{rank.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-white font-medium">{selectedUser.rank}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Level</label>
                      {editMode ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editValues.level || selectedUser.level}
                          onChange={(e) => setEditValues({...editValues, level: parseInt(e.target.value)})}
                          className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white"
                        />
                      ) : (
                        <p className="text-white font-medium">{selectedUser.level}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Financial Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-300 text-sm">Total Earnings</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={editValues.totalEarnings || selectedUser.totalEarnings}
                          onChange={(e) => setEditValues({...editValues, totalEarnings: parseFloat(e.target.value)})}
                          className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white"
                        />
                      ) : (
                        <p className="text-white font-medium">{formatCurrency(selectedUser.totalEarnings)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Wallet Amount</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={editValues.walletAmount || selectedUser.walletAmount}
                          onChange={(e) => setEditValues({...editValues, walletAmount: parseFloat(e.target.value)})}
                          className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{formatCurrency(selectedUser.walletAmount)}</p>
                          {canClaimWallet(selectedUser.directReferrals) ? (
                            <span className="text-green-400 text-xs">(Claimable)</span>
                          ) : (
                            <span className="text-red-400 text-xs">(Locked - Need 2 referrals)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Processing Amount</label>
                      <p className="text-white font-medium">{formatCurrency(selectedUser.processingAmount)}</p>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm">Direct Referrals</label>
                      <p className="text-white font-medium">{selectedUser.directReferrals}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank-wise Earnings */}
              <div className="mt-6 bg-black/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Rank-wise Earnings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(selectedUser.rankEarnings).map(([rank, amount]) => (
                    <div key={rank} className="bg-black/50 rounded-lg p-3">
                      <div className="text-gray-300 text-sm">{rank}</div>
                      <div className="text-white font-medium">{formatCurrency(amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level-wise Earnings */}
              <div className="mt-6 bg-black/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Level-wise Earnings</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                  {Object.entries(selectedUser.levelEarnings).map(([level, amount]) => {
                    const levelNum = parseInt(level);
                    const unlocked = isLevelUnlocked(selectedUser.rank, levelNum, selectedUser.totalEarnings);
                    return (
                      <div key={level} className={`rounded-lg p-2 text-center ${unlocked ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                        <div className="text-xs text-gray-300">L{level}</div>
                        <div className="text-sm font-medium text-white">{formatCurrency(amount)}</div>
                        {unlocked ? (
                          <CheckCircleIcon className="w-3 h-3 text-green-400 mx-auto mt-1" />
                        ) : (
                          <LockClosedIcon className="w-3 h-3 text-red-400 mx-auto mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              {editMode && (
                <div className="mt-6 flex gap-4 justify-end">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalIncomePage;