import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, DollarSign, CheckCircle, AlertCircle, XCircle, Target, Zap } from 'lucide-react';

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

  // Rank definitions with TopUp amounts and level distributions (Complete 10 ranks from Azurite to Jeremejevite)
  const rankDefinitions: RankData[] = [
    {
      rank: 'Azurite',
      topUpAmount: 5,
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
      levels: [
        { level: 1, amount: 50 }, { level: 2, amount: 40 }, { level: 3, amount: 30 },
        { level: 4, amount: 20 }, { level: 5, amount: 15 }, { level: 6, amount: 12.5 },
        { level: 7, amount: 10 }, { level: 8, amount: 7.5 }, { level: 9, amount: 5 },
        { level: 10, amount: 2.5 }
      ]
    },
    {
      rank: 'Garnet',
      topUpAmount: 500,
      levels: [
        { level: 1, amount: 100 }, { level: 2, amount: 80 }, { level: 3, amount: 60 },
        { level: 4, amount: 40 }, { level: 5, amount: 30 }, { level: 6, amount: 25 },
        { level: 7, amount: 20 }, { level: 8, amount: 15 }, { level: 9, amount: 10 },
        { level: 10, amount: 5 }
      ]
    },
    {
      rank: 'Hematite',
      topUpAmount: 1000,
      levels: [
        { level: 1, amount: 200 }, { level: 2, amount: 160 }, { level: 3, amount: 120 },
        { level: 4, amount: 80 }, { level: 5, amount: 60 }, { level: 6, amount: 50 },
        { level: 7, amount: 40 }, { level: 8, amount: 30 }, { level: 9, amount: 20 },
        { level: 10, amount: 10 }
      ]
    },
    {
      rank: 'Iolite',
      topUpAmount: 2500,
      levels: [
        { level: 1, amount: 500 }, { level: 2, amount: 400 }, { level: 3, amount: 300 },
        { level: 4, amount: 200 }, { level: 5, amount: 150 }, { level: 6, amount: 125 },
        { level: 7, amount: 100 }, { level: 8, amount: 75 }, { level: 9, amount: 50 },
        { level: 10, amount: 25 }
      ]
    },
    {
      rank: 'Jeremejevite',
      topUpAmount: 5000,
      levels: [
        { level: 1, amount: 1000 }, { level: 2, amount: 800 }, { level: 3, amount: 600 },
        { level: 4, amount: 400 }, { level: 5, amount: 300 }, { level: 6, amount: 250 },
        { level: 7, amount: 200 }, { level: 8, amount: 150 }, { level: 9, amount: 100 },
        { level: 10, amount: 50 }
      ]
    }
  ];

  // Fetch user data and transactions
  useEffect(() => {
    if (!userData?.uid) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userData.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserDetails({
            rank: data.rank || 'Azurite',
            isGlobalActive: data.isGlobalActive || false,
            globalIncomeTotal: data.globalIncomeTotal || 0,
            directReferrals: data.directReferrals || 0,
            displayName: data.displayName || 'User',
            teamSize: data.teamSize || 0,
            sponsorId: data.sponsorId,
            totalGlobalIncome: data.totalGlobalIncome || 0
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      }
    };

    // Fetch direct referrals count
    const fetchDirectReferrals = () => {
      const referralsQuery = query(
        collection(db, 'users'),
        where('sponsorId', '==', userData.uid)
      );
      
      return onSnapshot(referralsQuery, (snapshot) => {
        setDirectReferralsCount(snapshot.size);
      });
    };

    fetchUserData();
    const unsubscribeReferrals = fetchDirectReferrals();

    // Real-time listener for global income transactions
    const transactionsQuery = query(
      collection(db, 'users', userData.uid, 'incomeTransactions'),
      where('type', '==', 'global_income'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      async (snapshot) => {
        const transactionData: GlobalIncomeTransaction[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let fromUserName = 'Unknown User';
          
          // Fetch from user name
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
      unsubscribe();
      unsubscribeReferrals();
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
      'fluorite': 'Fluorite',
      'garnet': 'Garnet',
      'hematite': 'Hematite',
      'iolite': 'Iolite',
      'jeremejevite': 'Jeremejevite'
    };
    
    const userRankName = rankMap[userDetails?.rank?.toLowerCase() || 'azurite'] || 'Azurite';
    return rankDefinitions.find(r => r.rank === userRankName) || rankDefinitions[0];
  };

  // Get required direct referrals for current rank
  const getRequiredDirectReferrals = () => {
    // All ranks require 2 direct referrals as per the original specification
    return 2;
  };

  // Calculate summary statistics
  const summaryStats = {
    totalEarned: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
    withdrawnAmount: userDetails?.globalIncomeTotal || 0,
    totalTransactions: transactions.filter(t => t.status === 'completed').length,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    withdrawnTransactions: 0 // This would come from withdrawal records
  };

  // Level-wise breakdown
  const levelBreakdown = Array.from({ length: 10 }, (_, i) => {
    const level = i + 1;
    const levelTransactions = transactions.filter(t => t.level === level);
    const earned = levelTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
    const pending = levelTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const count = levelTransactions.length;
    
    return { level, earned, pending, count };
  });

  // Get current rank data
  const currentRankData = getCurrentRankData();

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
    return new Intl.DateTimeFormat('en-IN', {
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

  // Submit activation request
  const submitActivation = async () => {
    if (!transactionHash.trim()) {
      alert('Please enter transaction hash');
      return;
    }

    try {
      // Here you would typically call a Firebase function to handle the activation
      // For now, we'll just close the modal
      alert('Activation request submitted. Admin will verify and activate your Global Income.');
      setActivationModal(false);
      setTransactionHash('');
    } catch (err) {
      console.error('Error submitting activation:', err);
      alert('Failed to submit activation request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg font-medium">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Global Income Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Current Rank:</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                    {userDetails?.rank || 'Azurite'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">TopUp Amount:</span>
                  <span className="text-yellow-200 font-bold">
                    ${getCurrentRankData().topUpAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Direct Referrals:</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    {directReferralsCount}/{getRequiredDirectReferrals()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Global Income Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    userDetails?.isGlobalActive 
                      ? 'bg-green-500/80 text-white' 
                      : 'bg-red-500/80 text-white'
                  }`}>
                    {userDetails?.isGlobalActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {!userDetails?.isGlobalActive && (
            <div className="flex-shrink-0">
              <button
                onClick={handleActivation}
                disabled={!userDetails || userDetails.directReferrals < 2}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Activate Global Income
              </button>
            </div>
          )}
        </div>
        
        {/* Progress Bar for Direct Referrals */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Direct Referrals Progress</span>
            <span>{directReferralsCount}/{getRequiredDirectReferrals()}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((directReferralsCount / getRequiredDirectReferrals()) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Modern Global Income Status Card */}
      <div className="bg-white shadow-md rounded-2xl p-6 mb-8 border border-gray-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Global Income</h2>
          
          {!userDetails?.isGlobalActive ? (
            <div className="space-y-4">
              {/* Inactive Status Badge */}
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-2 text-sm font-medium">
                <XCircle className="h-4 w-4" />
                Not Active
              </div>
              
              {/* Status Message */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">🚫 Global Income Not Active</h3>
                    <p className="text-red-700 text-base leading-relaxed">
                      You need <span className="font-semibold">{Math.max(0, 2 - (userDetails?.directReferrals || 0))} more direct referrals</span> and rank activation to earn Global Income.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Direct Referrals Progress</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {directReferralsCount}/{getRequiredDirectReferrals()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((directReferralsCount / getRequiredDirectReferrals()) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Activation Button */}
              <button
                onClick={handleActivation}
                disabled={!userDetails || userDetails.directReferrals < 2}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Activate Global Income
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Status Badge */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-4 py-2 text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Active
              </div>
              
              {/* Active Status Message */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Global Income Active</h3>
                    <p className="text-green-700 text-base leading-relaxed">
                      You're earning from your team's activations across all levels.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Global Income Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Earned Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-green-800">Total Earned</p>
            <p className="text-2xl font-bold text-green-900">
              ${formatCurrency(summaryStats.totalEarned).replace('$', '')}
            </p>
            <p className="text-xs text-green-700">
              From {summaryStats.totalTransactions} transactions
            </p>
          </div>
        </div>
      
        {/* Pending Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-800">Pending Amount</p>
            <p className="text-2xl font-bold text-yellow-900">
              ${formatCurrency(summaryStats.pendingAmount).replace('$', '')}
            </p>
            <p className="text-xs text-yellow-700">
              {summaryStats.pendingTransactions} pending transactions
            </p>
          </div>
        </div>
      
        {/* Withdrawn Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
              Withdrawn
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-800">Withdrawn</p>
            <p className="text-2xl font-bold text-blue-900">
              ${formatCurrency(summaryStats.withdrawnAmount).replace('$', '')}
            </p>
            <p className="text-xs text-blue-700">
              {summaryStats.withdrawnTransactions} withdrawals
            </p>
          </div>
        </div>
      </div>
      {/* Modern Level-wise Income Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Level-wise Income Breakdown</h3>
          <p className="text-gray-600 text-base">Track your earnings across all 10 levels</p>
        </div>
        
        <div className="space-y-4 max-w-4xl mx-auto">
          {levelBreakdown.map(({ level, earned, pending, count }) => {
            const expectedAmount = currentRankData.levels[level - 1]?.amount || 0;
            
            // Gradient colors for each level
            const getGradientColors = (level: number) => {
              const gradients = [
                'from-blue-500 to-blue-600', // Level 1 - Blue
                'from-green-500 to-green-600', // Level 2 - Green  
                'from-purple-500 to-purple-600', // Level 3 - Purple
                'from-orange-500 to-orange-600', // Level 4 - Orange
                'from-pink-500 to-pink-600', // Level 5 - Pink
                'from-indigo-500 to-indigo-600', // Level 6 - Indigo
                'from-teal-500 to-teal-600', // Level 7 - Teal
                'from-red-500 to-red-600', // Level 8 - Red
                'from-yellow-500 to-yellow-600', // Level 9 - Yellow
                'from-gray-500 to-gray-600', // Level 10 - Gray
              ];
              return gradients[level - 1] || 'from-gray-500 to-gray-600';
            };

            const getBadgeColors = (level: number) => {
              const colors = [
                'bg-blue-100 text-blue-800', // Level 1
                'bg-green-100 text-green-800', // Level 2
                'bg-purple-100 text-purple-800', // Level 3
                'bg-orange-100 text-orange-800', // Level 4
                'bg-pink-100 text-pink-800', // Level 5
                'bg-indigo-100 text-indigo-800', // Level 6
                'bg-teal-100 text-teal-800', // Level 7
                'bg-red-100 text-red-800', // Level 8
                'bg-yellow-100 text-yellow-800', // Level 9
                'bg-gray-100 text-gray-800', // Level 10
              ];
              return colors[level - 1] || 'bg-gray-100 text-gray-800';
            };

            const getRankName = (level: number) => {
              if (level <= 3) return 'Azurite Rank';
              if (level <= 6) return 'Sapphire Rank';
              if (level <= 8) return 'Ruby Rank';
              if (level <= 9) return 'Emerald Rank';
              return 'Diamond Rank';
            };
            
            return (
              <div key={level} className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Section - Level Info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${getGradientColors(level)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {level}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-900">Level {level}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColors(level)}`}>
                          {getRankName(level)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${expectedAmount.toFixed(2)} per activation
                      </p>
                    </div>
                  </div>
                  
                  {/* Right Section - Stats */}
                  <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                    {/* Earnings */}
                    <div className="text-center sm:text-left">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700">Earnings</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">${earned.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{count} transactions</p>
                    </div>
                    
                    {/* Pending (if any) */}
                    {pending > 0 && (
                      <div className="text-center sm:text-left">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-700">Pending</span>
                        </div>
                        <p className="text-lg font-semibold text-yellow-600">${pending.toFixed(2)}</p>
                      </div>
                    )}
                    
                    {/* Status Indicator */}
                    <div className="text-center sm:text-left">
                      <div className="flex items-center gap-1 mb-1">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Status</span>
                      </div>
                      {count > 0 ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-500">Waiting</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Global Income */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Global Income</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">No Global Income Yet</p>
            <p className="text-gray-500 text-sm mt-1">Your global income transactions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice(0, 10).map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Level {transaction.level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rank Information */}
      <div className="bg-white border border-indigo-200 rounded-xl p-6 shadow-lg">
        <h4 className="font-semibold text-indigo-900 mb-4 text-lg">Current Rank: {userDetails?.rank || 'Azurite'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-indigo-800 font-medium mb-3">Rank Requirements</h5>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${(userDetails?.directReferrals || 0) >= 2 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                2 Direct Referrals ({userDetails?.directReferrals || 0}/2)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                TopUp Amount: {formatCurrency(currentRankData.topUpAmount)}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${userDetails?.isGlobalActive ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                Global Income: {userDetails?.isGlobalActive ? 'Active' : 'Inactive'}
              </li>
            </ul>
          </div>
          <div>
            <h5 className="text-indigo-800 font-medium mb-3">Income Structure</h5>
            <div className="text-sm text-gray-700 space-y-1">
              <p>10 Levels with reverse global matrix</p>
              <p>Level 1: {formatCurrency(currentRankData.levels[0]?.amount || 0)}</p>
              <p>Level 2: {formatCurrency(currentRankData.levels[1]?.amount || 0)}</p>
              <p>Level 3: {formatCurrency(currentRankData.levels[2]?.amount || 0)}</p>
              <p className="text-indigo-600">... and 7 more levels</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activation Modal */}
      {activationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activate Global Income</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 mb-2">
                  TopUp Amount: <span className="font-bold text-gray-900">{formatCurrency(currentRankData.topUpAmount)}</span>
                </p>
                <p className="text-gray-600 text-sm">
                  Send USDT BEP20 to the provided wallet address and enter the transaction hash below.
                </p>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Enter transaction hash"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActivationModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitActivation}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GlobalIncomePage;