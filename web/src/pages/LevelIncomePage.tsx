import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  orderBy, 
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  FunnelIcon,
  MagnifyingGlassIcon,
  ClipboardIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface IncomeTransaction {
  id: string;
  type: 'Level Income' | 'Re-Level Income';
  fromUser: string;
  amount: number;
  level: number;
  status: 'pending' | 'approved';
  createdAt: Timestamp;
}

interface UserData {
  displayName?: string;
  fullName?: string;
  email?: string;
  userCode?: string;
}

const LevelIncomePage: React.FC = () => {
  const { user, userData } = useAuth();
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [userNames, setUserNames] = useState<{ [key: string]: UserData }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filter and search states
  const [activeTab, setActiveTab] = useState<'all' | 'level' | 're-level'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // Mobile accordion state
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

  // Level percentages for reference (10 levels total)
  const levelPercentages = {
    1: 5,   // Level 1: 5%
    2: 4,   // Level 2: 4%
    3: 3,   // Level 3: 3%
    4: 1,   // Level 4: 1%
    5: 1,   // Level 5: 1%
    6: 1,   // Level 6: 1%
    7: 0.5, // Level 7: 0.5%
    8: 0.5, // Level 8: 0.5%
    9: 0.5, // Level 9: 0.5%
    10: 0.5 // Level 10: 0.5%
  };

  // Fetch user data for fromUser
  const fetchUserData = useCallback(async (userId: string): Promise<UserData> => {
    if (userNames[userId]) {
      return userNames[userId];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        const userInfo = {
          displayName: userData.displayName,
          fullName: userData.fullName,
          email: userData.email,
          userCode: userData.userCode
        };
        setUserNames(prev => ({ ...prev, [userId]: userInfo }));
        return userInfo;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    
    const fallbackData = {
      displayName: `User ${userId.slice(0, 8)}...`,
      userCode: userId.slice(0, 8)
    };
    setUserNames(prev => ({ ...prev, [userId]: fallbackData }));
    return fallbackData;
  }, [userNames]);

  // Setup real-time listener for income transactions
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const incomeTransactionsRef = collection(db, 'users', user.uid, 'incomeTransactions');
    const q = query(
      incomeTransactionsRef,
      orderBy('createdAt', 'desc'),
      limit(itemsPerPage)
    );

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        try {
          const transactionsList: IncomeTransaction[] = [];
          
          for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            transactionsList.push({
              id: docSnapshot.id,
              type: data.type,
              fromUser: data.fromUser,
              amount: data.amount,
              level: data.level,
              status: data.status,
              createdAt: data.createdAt
            });

            // Fetch user data for each transaction
            await fetchUserData(data.fromUser);
          }

          setTransactions(transactionsList);
           setHasMore(snapshot.docs.length === itemsPerPage);
           setLoading(false);
        } catch (err) {
          console.error('Error fetching transactions:', err);
          setError('Failed to load income transactions');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in transactions listener:', err);
        setError('Failed to load income transactions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
   }, [user?.uid, itemsPerPage, fetchUserData]);

  // Filter transactions based on active filters
  const filteredTransactions = transactions.filter(transaction => {
    // Tab filter
    if (activeTab === 'level' && transaction.type !== 'Level Income') return false;
    if (activeTab === 're-level' && transaction.type !== 'Re-Level Income') return false;
    
    // Status filter
    if (statusFilter !== 'all' && transaction.status !== statusFilter) return false;
    
    // Level filter
    if (levelFilter !== 'all' && transaction.level.toString() !== levelFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const userData = userNames[transaction.fromUser];
      const searchableText = [
        userData?.displayName,
        userData?.fullName,
        userData?.userCode,
        transaction.type,
        transaction.amount.toString(),
        transaction.level.toString()
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm.toLowerCase())) return false;
    }
    
    return true;
  });

  // Calculate summary data
  const summaryData = {
    totalLevelIncome: transactions
      .filter(t => t.type === 'Level Income' && t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0),
    totalReLevelIncome: transactions
      .filter(t => t.type === 'Re-Level Income' && t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0),
    availableBalance: userData?.availableBalance || 0,
    pendingAmount: transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0)
  };

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

  // Toggle card expansion (mobile)
  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Format date
  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get level color
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    return colors[(level - 1) % colors.length] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Level Income & Re-Level Income
          </h1>
          <p className="text-slate-300 text-lg">
            Track your earnings from team activations and rank upgrades
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 shadow-md">
            <div className="text-blue-100 text-sm font-medium">Total Level Income</div>
            <div className="text-white text-2xl font-bold">${summaryData.totalLevelIncome.toFixed(2)}</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 shadow-md">
            <div className="text-purple-100 text-sm font-medium">Total Re-Level Income</div>
            <div className="text-white text-2xl font-bold">${summaryData.totalReLevelIncome.toFixed(2)}</div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 shadow-md">
            <div className="text-green-100 text-sm font-medium">Available Balance</div>
            <div className="text-white text-2xl font-bold">${summaryData.availableBalance.toFixed(2)}</div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl p-6 shadow-md">
            <div className="text-yellow-100 text-sm font-medium">Pending Amount</div>
            <div className="text-white text-2xl font-bold">${summaryData.pendingAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Level Percentages Info */}

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 shadow-md space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Transactions' },
              { key: 'level', label: 'Level Income' },
              { key: 're-level', label: 'Re-Level Income' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'all' | 'level' | 're-level')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Filter Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user, amount, level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {showFilters ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-600">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Level</label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                    <option key={level} value={level.toString()}>
                      Level {level} ({levelPercentages[level as keyof typeof levelPercentages]}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-md overflow-hidden">
          {error ? (
            <div className="p-6 text-center">
              <div className="text-red-400 text-lg font-medium">{error}</div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-slate-400 text-lg">No transactions found</div>
              <div className="text-slate-500 text-sm mt-2">
                {searchTerm || statusFilter !== 'all' || levelFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Income transactions will appear here when available'
                }
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">From User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {filteredTransactions.map((transaction) => {
                      const userData = userNames[transaction.fromUser];
                      return (
                        <tr key={transaction.id} className="hover:bg-slate-600 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              transaction.type === 'Level Income' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-white font-medium">
                              {userData?.displayName || userData?.fullName || 'Loading...'}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {userData?.userCode || transaction.fromUser.slice(0, 8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                            ${transaction.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(transaction.level)}`}>
                              Level {transaction.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(transaction.status)}`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => copyToClipboard(userData?.userCode || transaction.fromUser, transaction.id)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {copiedId === transaction.id ? (
                                <CheckIcon className="h-5 w-5" />
                              ) : (
                                <ClipboardIcon className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {filteredTransactions.map((transaction) => {
                  const userData = userNames[transaction.fromUser];
                  const isExpanded = expandedCards[transaction.id];
                  
                  return (
                    <div key={transaction.id} className="bg-slate-600 rounded-2xl shadow-md overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleCardExpansion(transaction.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                transaction.type === 'Level Income' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {transaction.type}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </span>
                            </div>
                            <div className="text-white font-medium">
                              ${transaction.amount.toFixed(2)}
                            </div>
                            <div className="text-slate-400 text-sm">
                              From: {userData?.displayName || userData?.fullName || 'Loading...'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(transaction.level)}`}>
                              L{transaction.level}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-500 pt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-slate-400">User Code</div>
                              <div className="text-white font-medium">
                                {userData?.userCode || transaction.fromUser.slice(0, 8)}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Date</div>
                              <div className="text-white">
                                {formatDate(transaction.createdAt)}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(userData?.userCode || transaction.fromUser, transaction.id);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {copiedId === transaction.id ? (
                              <>
                                <CheckIcon className="h-4 w-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <ClipboardIcon className="h-4 w-4" />
                                Copy User Code
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-4 shadow-md">
            <div className="text-slate-300 text-sm">
              Showing {filteredTransactions.length} transactions
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <span className="px-3 py-1 bg-slate-600 text-white rounded-lg">
                {currentPage}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!hasMore}
                className="p-2 rounded-lg bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelIncomePage;