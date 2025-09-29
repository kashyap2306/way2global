import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Target, 
  Zap,
  Users,
  Star,
  Trophy,
  Unlock,
  Lock,
  ArrowUp,
  Gift,
  Coins
} from 'lucide-react';

interface GlobalIncomeTransaction {
  id: string;
  type: 'global_income';
  amount: number;
  level: number;
  fromUserId: string;
  fromUserName?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date | { toDate(): Date };
  transactionHash?: string;
}

interface RankData {
  rank: string;
  topUpAmount: number;
  levels: { level: number; amount: number }[];
  color: string;
  icon: string;
}

interface UserData {
  rank: string;
  isGlobalActive: boolean;
  globalIncomeTotal: number;
  directReferrals: number;
  displayName: string;
  teamSize: number;
  sponsorId?: string;
  totalGlobalIncome: number;
  availableBalance: number;
  lockedBalance: number;
}

const GlobalIncomePage: React.FC = () => {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<GlobalIncomeTransaction[]>([]);
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activationModal, setActivationModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [directReferralsCount, setDirectReferralsCount] = useState(0);

  // Enhanced rank definitions with colors and icons
  const rankDefinitions: RankData[] = [
    {
      rank: 'Azurite',
      topUpAmount: 5,
      color: 'from-blue-400 to-blue-600',
      icon: '💎',
      levels: [
        { level: 1, amount: 1 }, { level: 2, amount: 0.8 }, { level: 3, amount: 0.6 },
        { level: 4, amount: 0.4 }, { level: 5, amount: 0.3 }, { level: 6, amount: 0.25 },
        { level: 7, amount: 0.2 }, { level: 8, amount: 0.15 }, { level: 9, amount: 0.1 },
        { level: 10, amount: 0.05 }
      ]
    },
    {
      rank: 'Benitoite',
      topUpAmount: 10,
      color: 'from-purple-400 to-purple-600',
      icon: '🔮',
      levels: [
        { level: 1, amount: 2 }, { level: 2, amount: 1.6 }, { level: 3, amount: 1.2 },
        { level: 4, amount: 0.8 }, { level: 5, amount: 0.6 }, { level: 6, amount: 0.5 },
        { level: 7, amount: 0.4 }, { level: 8, amount: 0.3 }, { level: 9, amount: 0.2 },
        { level: 10, amount: 0.1 }
      ]
    },
    {
      rank: 'Citrine',
      topUpAmount: 25,
      color: 'from-yellow-400 to-yellow-600',
      icon: '✨',
      levels: [
        { level: 1, amount: 5 }, { level: 2, amount: 4 }, { level: 3, amount: 3 },
        { level: 4, amount: 2 }, { level: 5, amount: 1.5 }, { level: 6, amount: 1.25 },
        { level: 7, amount: 1 }, { level: 8, amount: 0.75 }, { level: 9, amount: 0.5 },
        { level: 10, amount: 0.25 }
      ]
    },
    {
      rank: 'Danburite',
      topUpAmount: 50,
      color: 'from-green-400 to-green-600',
      icon: '🌟',
      levels: [
        { level: 1, amount: 10 }, { level: 2, amount: 8 }, { level: 3, amount: 6 },
        { level: 4, amount: 4 }, { level: 5, amount: 3 }, { level: 6, amount: 2.5 },
        { level: 7, amount: 2 }, { level: 8, amount: 1.5 }, { level: 9, amount: 1 },
        { level: 10, amount: 0.5 }
      ]
    },
    {
      rank: 'Emerald',
      topUpAmount: 100,
      color: 'from-emerald-400 to-emerald-600',
      icon: '💚',
      levels: [
        { level: 1, amount: 20 }, { level: 2, amount: 16 }, { level: 3, amount: 12 },
        { level: 4, amount: 8 }, { level: 5, amount: 6 }, { level: 6, amount: 5 },
        { level: 7, amount: 4 }, { level: 8, amount: 3 }, { level: 9, amount: 2 },
        { level: 10, amount: 1 }
      ]
    },
    {
      rank: 'Fluorite',
      topUpAmount: 250,
      color: 'from-pink-400 to-pink-600',
      icon: '🌸',
      levels: [
        { level: 1, amount: 50 }, { level: 2, amount: 40 }, { level: 3, amount: 30 },
        { level: 4, amount: 20 }, { level: 5, amount: 15 }, { level: 6, amount: 12.5 },
        { level: 7, amount: 10 }, { level: 8, amount: 7.5 }, { level: 9, amount: 5 },
        { level: 10, amount: 2.5 }
      ]
    }
  ];

  useEffect(() => {
    if (!userData?.uid) return;

    setLoading(true);

    // Fetch user details
    const userDocRef = doc(db, 'users', userData.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserDetails({
          rank: data.rank || 'Azurite',
          isGlobalActive: data.isGlobalActive || false,
          globalIncomeTotal: data.globalIncomeTotal || 0,
          directReferrals: data.directReferrals || 0,
          displayName: data.displayName || 'User',
          teamSize: data.teamSize || 0,
          sponsorId: data.sponsorId,
          totalGlobalIncome: data.totalGlobalIncome || 0,
          availableBalance: data.availableBalance || 0,
          lockedBalance: data.lockedBalance || 0
        });
      }
    });

    // Fetch direct referrals count
    const referralsQuery = query(
      collection(db, 'users'),
      where('sponsorId', '==', userData.uid)
    );

    const unsubscribeReferrals = onSnapshot(referralsQuery, (snapshot) => {
      setDirectReferralsCount(snapshot.size);
    });

    // Fetch global income transactions
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', userData.uid),
      where('type', '==', 'global_income'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeTransactions = onSnapshot(
      transactionsQuery,
      async (snapshot) => {
        const transactionData: GlobalIncomeTransaction[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let fromUserName = 'System';
          
          if (data.fromUserId) {
            try {
              const fromUserDoc = await getDoc(doc(db, 'users', data.fromUserId));
              if (fromUserDoc.exists()) {
                fromUserName = fromUserDoc.data().displayName || 'Unknown User';
              }
            } catch (err) {
              console.error('Error fetching from user name:', err);
            }
          }
          
          transactionData.push({
            id: docSnap.id,
            type: data.type,
            amount: data.amount || 0,
            level: data.level || 1,
            fromUserId: data.fromUserId || '',
            fromUserName,
            status: data.status || 'pending',
            createdAt: data.createdAt,
            transactionHash: data.transactionHash
          });
        }
        
        setTransactions(transactionData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeReferrals();
      unsubscribeTransactions();
    };
  }, [userData?.uid]);

  // Get current rank data
  const getCurrentRankData = (): RankData => {
    const rankMap: { [key: string]: string } = {
      'azurite': 'Azurite',
      'benitoite': 'Benitoite', 
      'citrine': 'Citrine',
      'danburite': 'Danburite',
      'emerald': 'Emerald',
      'fluorite': 'Fluorite'
    };
    
    const userRankName = rankMap[userDetails?.rank?.toLowerCase() || 'azurite'] || 'Azurite';
    return rankDefinitions.find(r => r.rank === userRankName) || rankDefinitions[0];
  };

  // Get required direct referrals
  const getRequiredDirectReferrals = () => 2;

  // Calculate summary statistics
  const summaryStats = {
    totalEarned: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
    availableBalance: userDetails?.availableBalance || 0,
    lockedBalance: userDetails?.lockedBalance || 0
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp: Date | { toDate(): Date } | null) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle rank activation
  const handleActivation = () => {
    if (!userDetails || userDetails.directReferrals < 2) {
      alert('You need at least 2 direct referrals to activate Global Income.');
      return;
    }
    setActivationModal(true);
  };

  // Handle claim
  const handleClaim = async () => {
    if (summaryStats.lockedBalance <= 0) {
      alert('No locked balance to claim.');
      return;
    }

    if (directReferralsCount < 2) {
      alert('You need at least 2 direct referrals to claim your income.');
      return;
    }

    try {
      // Here you would call the claim API
      alert('Claim request submitted successfully!');
    } catch (err) {
      console.error('Error claiming income:', err);
      alert('Failed to claim income. Please try again.');
    }
  };

  const currentRankData = getCurrentRankData();
  const progressPercentage = Math.min((directReferralsCount / getRequiredDirectReferrals()) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-yellow-800 text-lg font-medium">Loading your Global Income...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-4">
            Global Income Dashboard
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Track your passive income, manage your pools, and claim your earnings
          </p>
        </div>

        {/* User Status Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-yellow-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${currentRankData.color} flex items-center justify-center text-2xl shadow-lg`}>
                  {currentRankData.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{userDetails?.displayName}</h2>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-lg font-semibold text-yellow-600">{currentRankData.rank}</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{directReferralsCount}</div>
                  <div className="text-sm text-gray-600">Direct Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.availableBalance)}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(summaryStats.lockedBalance)}</div>
                  <div className="text-sm text-gray-600">Locked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(summaryStats.totalEarned)}</div>
                  <div className="text-sm text-gray-600">Total Earned</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              {!userDetails?.isGlobalActive ? (
                <button
                  onClick={handleActivation}
                  disabled={directReferralsCount < 2}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Zap className="w-5 h-5" />
                  Activate Global Income
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-2xl font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Global Income Active
                </div>
              )}
              
              {summaryStats.lockedBalance > 0 && (
                <button
                  onClick={handleClaim}
                  disabled={directReferralsCount < 2}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Unlock className="w-5 h-5" />
                  Claim {formatCurrency(summaryStats.lockedBalance)}
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Direct Referrals Progress</span>
              <span className="text-sm font-bold text-gray-900">{directReferralsCount}/{getRequiredDirectReferrals()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            {directReferralsCount < 2 && (
              <p className="text-sm text-gray-600 mt-2">
                You need {2 - directReferralsCount} more direct referrals to unlock income claiming
              </p>
            )}
          </div>
        </div>

        {/* Income Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Available Balance */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Coins className="w-6 h-6 text-green-600" />
              </div>
              <ArrowUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.availableBalance)}</p>
              <p className="text-xs text-gray-500">Ready to withdraw</p>
            </div>
          </div>

          {/* Locked Balance */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Locked Balance</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(summaryStats.lockedBalance)}</p>
              <p className="text-xs text-gray-500">Needs 2 referrals to unlock</p>
            </div>
          </div>

          {/* Total Earned */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <Trophy className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summaryStats.totalEarned)}</p>
              <p className="text-xs text-gray-500">All-time earnings</p>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <Target className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summaryStats.pendingAmount)}</p>
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          </div>
        </div>

        {/* Rank Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Star className="w-7 h-7 text-yellow-500" />
            Your Rank Progress
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankDefinitions.slice(0, 6).map((rank, index) => {
              const isCurrentRank = rank.rank === currentRankData.rank;
              const isUnlocked = index <= rankDefinitions.findIndex(r => r.rank === currentRankData.rank);
              
              return (
                <div 
                  key={rank.rank}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isCurrentRank 
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg' 
                      : isUnlocked
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {isCurrentRank && (
                    <div className="absolute -top-3 -right-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${rank.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {rank.icon}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{rank.rank}</h4>
                    <p className="text-sm text-gray-600 mb-3">TopUp: {formatCurrency(rank.topUpAmount)}</p>
                    
                    {isCurrentRank && (
                      <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                        Active Rank
                      </div>
                    )}
                    
                    {!isCurrentRank && isUnlocked && (
                      <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                        Unlocked
                      </div>
                    )}
                    
                    {!isUnlocked && (
                      <div className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-green-500" />
            Recent Transactions
          </h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-600 mb-2">No Transactions Yet</h4>
              <p className="text-gray-500">Your global income transactions will appear here once you start earning</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-2 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-700">Level</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-700">From</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-2 text-sm text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="py-4 px-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                          Level {transaction.level}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-semibold text-green-600">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-4 px-2 text-sm text-gray-600">
                        {transaction.fromUserName}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">How Global Income Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Get 2 Direct Referrals</h4>
              <p className="text-sm opacity-90">Invite friends to join and activate their accounts</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Activate Your Rank</h4>
              <p className="text-sm opacity-90">Choose and activate any rank to start earning</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Earn Passive Income</h4>
              <p className="text-sm opacity-90">Receive continuous income from global matrix</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activation Modal */}
      {activationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Activate Global Income</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter transaction hash"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setActivationModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (transactionHash.trim()) {
                      alert('Activation request submitted!');
                      setActivationModal(false);
                      setTransactionHash('');
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalIncomePage;