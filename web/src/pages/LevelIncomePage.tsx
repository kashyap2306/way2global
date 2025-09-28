import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface LevelIncomeTransaction {
  id: string;
  amount: number;
  fromUserId: string;
  level: number;
  createdAt: Timestamp;
  status: 'completed' | 'pending' | 'failed';
  type: 'level_income';
}

interface UserData {
  displayName?: string;
  fullName?: string;
  email?: string;
}

// Rank-based payout configuration (10 levels for each rank)
const rankPayoutCharts = {
  'Azurite': [5, 4, 3, 2, 1, 1, 0.5, 0.5, 0.25, 0.25],
  'Benitoite': [10, 8, 6, 4, 2, 2, 1, 1, 0.5, 0.5],
  'Citrine': [25, 20, 15, 10, 5, 5, 2.5, 2.5, 1.25, 1.25],
  'Danburite': [50, 40, 30, 20, 10, 10, 5, 5, 2.5, 2.5],
  'Emerald': [125, 100, 75, 50, 25, 25, 12.5, 12.5, 6.25, 6.25],
  'Fluorite': [250, 200, 150, 100, 50, 50, 25, 25, 12.5, 12.5],
  'Garnet': [500, 400, 300, 200, 100, 100, 50, 50, 25, 25],
  'Hematite': [1000, 800, 600, 400, 200, 200, 100, 100, 50, 50],
  'Iolite': [2500, 2000, 1500, 1000, 500, 500, 250, 250, 125, 125],
  'Jeremejevite': [5000, 4000, 3000, 2000, 1000, 1000, 500, 500, 250, 250]
};

const LevelIncomePage: React.FC = () => {
  const { user, userData } = useAuth();
  const [levelIncomeTransactions, setLevelIncomeTransactions] = useState<LevelIncomeTransaction[]>([]);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<{ [key: number]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllLevels, setShowAllLevels] = useState(false);

  // Get current user's rank, default to Azurite
  const currentRank = userData?.rank || 'Azurite';
  const currentPayoutChart = rankPayoutCharts[currentRank as keyof typeof rankPayoutCharts] || rankPayoutCharts['Azurite'];

  // Level colors for consistent theming (extended to 10 levels)
  const levelColors = {
    1: { bg: 'from-emerald-500 to-emerald-600', border: 'border-emerald-400', text: 'text-emerald-100', accent: 'bg-emerald-400' },
    2: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-400', text: 'text-blue-100', accent: 'bg-blue-400' },
    3: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-400', text: 'text-purple-100', accent: 'bg-purple-400' },
    4: { bg: 'from-amber-500 to-amber-600', border: 'border-amber-400', text: 'text-amber-100', accent: 'bg-amber-400' },
    5: { bg: 'from-pink-500 to-pink-600', border: 'border-pink-400', text: 'text-pink-100', accent: 'bg-pink-400' },
    6: { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-400', text: 'text-indigo-100', accent: 'bg-indigo-400' },
    7: { bg: 'from-red-500 to-red-600', border: 'border-red-400', text: 'text-red-100', accent: 'bg-red-400' },
    8: { bg: 'from-teal-500 to-teal-600', border: 'border-teal-400', text: 'text-teal-100', accent: 'bg-teal-400' },
    9: { bg: 'from-orange-500 to-orange-600', border: 'border-orange-400', text: 'text-orange-100', accent: 'bg-orange-400' },
    10: { bg: 'from-cyan-500 to-cyan-600', border: 'border-cyan-400', text: 'text-cyan-100', accent: 'bg-cyan-400' }
  };

  // Fetch user names for fromUserId
  const fetchUserName = async (userId: string): Promise<string> => {
    if (userNames[userId]) {
      return userNames[userId];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        const name = userData.displayName || userData.fullName || userData.email || 'Unknown User';
        setUserNames(prev => ({ ...prev, [userId]: name }));
        return name;
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
    
    const fallbackName = `User ${userId.slice(0, 8)}...`;
    setUserNames(prev => ({ ...prev, [userId]: fallbackName }));
    return fallbackName;
  };

  // Setup real-time listener for level income transactions
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const incomeTransactionsRef = collection(db, 'users', user.uid, 'incomeTransactions');
    const q = query(
      incomeTransactionsRef,
      where('type', '==', 'level_income'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const transactions: LevelIncomeTransaction[] = [];
          
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            transactions.push({
              id: docSnap.id,
              amount: data.amount || 0,
              fromUserId: data.fromUserId || '',
              level: data.level || 1,
              createdAt: data.createdAt,
              status: data.status || 'completed',
              type: 'level_income'
            });
          }

          setLevelIncomeTransactions(transactions);

          // Fetch user names for all fromUserIds
          const userIds = [...new Set(transactions.map(t => t.fromUserId).filter(Boolean))];
          for (const userId of userIds) {
            await fetchUserName(userId);
          }

          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing transactions:', err);
          setError('Failed to load level income data');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching level income transactions:', err);
        setError('Failed to load level income data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Toggle accordion level
  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }));
  };

  // Calculate summary statistics
  const completedTransactions = levelIncomeTransactions.filter(t => t.status === 'completed');
  const pendingTransactions = levelIncomeTransactions.filter(t => t.status === 'pending');
  
  const totalLevelIncome = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingIncome = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = levelIncomeTransactions.length;
  const highestTransaction = levelIncomeTransactions.length > 0 
    ? Math.max(...levelIncomeTransactions.map(t => t.amount))
    : 0;

  // Get level-wise breakdown for 10 levels based on current rank
  const levelBreakdown = Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    const levelTransactions = levelIncomeTransactions.filter(t => t.level === level);
    const completedLevelTransactions = levelTransactions.filter(t => t.status === 'completed');
    const totalAmount = completedLevelTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = levelTransactions.length;
    const perActivationIncome = currentPayoutChart[index] || 0;
    const percentage = totalLevelIncome > 0 ? (totalAmount / totalLevelIncome) * 100 : 0;
    return { 
      level, 
      totalAmount, 
      count, 
      perActivationIncome, 
      percentage, 
      transactions: levelTransactions 
    };
  });

  // Determine which levels to show
  const levelsToShow = showAllLevels ? levelBreakdown : levelBreakdown.slice(0, 3);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format date for Indian locale
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 px-2 sm:px-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-700">Loading level income data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 px-2 sm:px-0">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100">
      <div className="px-2 sm:px-4 lg:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Level Income Dashboard</h1>
          <p className="text-gray-600">Track your multi-level commission earnings for {currentRank} rank</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Level Income Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-6 shadow-xl border border-emerald-400/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-emerald-200 text-sm font-medium">TOTAL</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">${totalLevelIncome.toFixed(2)}</h3>
              <p className="text-emerald-200 text-sm">Level Income Earned</p>
            </div>
          </div>

          {/* Pending Income Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 rounded-2xl p-6 shadow-xl border border-amber-400/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-amber-200 text-sm font-medium">PENDING</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">${pendingIncome.toFixed(2)}</h3>
              <p className="text-amber-200 text-sm">Pending Income</p>
            </div>
          </div>

          {/* Highest Transaction Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 shadow-xl border border-purple-400/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-purple-200 text-sm font-medium">HIGHEST</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">${highestTransaction.toFixed(2)}</h3>
              <p className="text-purple-200 text-sm">Highest Transaction</p>
            </div>
          </div>

          {/* Total Transactions Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 rounded-2xl p-6 shadow-xl border border-blue-400/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-blue-200 text-sm font-medium">COUNT</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{totalTransactions}</h3>
              <p className="text-blue-200 text-sm">Total Transactions</p>
            </div>
          </div>
        </div>

        {/* Level Income Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Level Income Breakdown</h2>
                <p className="text-gray-600">10-level matrix for {currentRank} rank</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Current Rank:</span>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium">
                  {currentRank}
                </span>
              </div>
            </div>
          </div>

          {/* Level Cards Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {levelsToShow.map(({ level, totalAmount, count, perActivationIncome, percentage, transactions }) => {
                const colors = levelColors[level as keyof typeof levelColors];
                const isExpanded = expandedLevels[level];
                
                return (
                  <div key={level} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                    {/* Card Header */}
                    <div className={`bg-gradient-to-r ${colors.bg} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{level}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Level {level}</h3>
                            <p className="text-white/80 text-sm">${perActivationIncome} per activation</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Total Earned:</span>
                          <span className="font-bold text-gray-800">${totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Transactions:</span>
                          <span className="font-medium text-gray-700">{count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {count > 0 ? 'Active' : 'No Earnings'}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${colors.bg} transition-all duration-500`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        {transactions.length > 0 && (
                          <button
                            onClick={() => toggleLevel(level)}
                            className="w-full mt-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <span className="text-sm font-medium">
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Transaction Details */}
                      {isExpanded && transactions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 animate-in slide-in-from-top duration-300">
                          {transactions.slice(0, 3).map((transaction) => (
                            <div 
                              key={transaction.id} 
                              className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-800">
                                    {userNames[transaction.fromUserId] || 'Loading...'}
                                  </p>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(transaction.status)}`}>
                                    {transaction.status}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600">{formatDate(transaction.createdAt)}</p>
                                  <p className="text-sm font-bold text-gray-800">${transaction.amount.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {transactions.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{transactions.length - 3} more transactions
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View More/Less Button */}
            <div className="text-center">
              <button
                onClick={() => setShowAllLevels(!showAllLevels)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {showAllLevels ? (
                  <>
                    <EyeSlashIcon className="w-5 h-5" />
                    <span>View Less</span>
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-5 h-5" />
                    <span>View More ({levelBreakdown.length - 3} more levels)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Commission Structure Info */}
        <div className="bg-gradient-to-br from-emerald-600/20 via-emerald-700/20 to-green-600/20 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-emerald-300 mb-4">{currentRank} Rank - Commission Structure</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {currentPayoutChart.map((amount, index) => (
              <div key={index + 1} className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-700 font-medium text-sm">L{index + 1}</span>
                <span className="text-emerald-800 font-bold text-sm">${amount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-emerald-700 text-sm space-y-1">
            <p>• Earn commissions from 10 levels deep in your network</p>
            <p>• Real-time tracking and instant payouts</p>
            <p>• Higher amounts for closer levels in {currentRank} rank</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelIncomePage;