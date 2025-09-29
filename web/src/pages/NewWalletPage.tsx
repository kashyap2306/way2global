import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface WalletData {
  availableBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  thisMonthEarnings: number;
  thisMonthWithdrawals: number;
  directReferralsCount: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: Timestamp;
  metadata?: Record<string, any>;
}

interface IncomePool {
  id: string;
  rank: string;
  poolIncome: number;
  canClaim: boolean;
  directReferralsCount: number;
  requiredDirectReferrals: number;
}

const NewWalletPage: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData>({
    availableBalance: 0,
    lockedBalance: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    thisMonthEarnings: 0,
    thisMonthWithdrawals: 0,
    directReferralsCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [incomePools, setIncomePools] = useState<IncomePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingPool, setClaimingPool] = useState<string | null>(null);

  // Format currency to USD
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction type icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income_claim':
        return <Unlock className="w-5 h-5 text-green-500" />;
      case 'referral_income':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get transaction type label
  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'income_claim':
        return 'Income Claimed';
      case 'referral_income':
        return 'Referral Income';
      case 'withdrawal':
        return 'Withdrawal';
      case 'deposit':
        return 'Deposit';
      case 'rank_activation':
        return 'Rank Activation';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Handle withdraw button click
  const handleWithdraw = () => {
    navigate('/withdrawal');
  };

  // Handle claim income from pool
  const handleClaimIncome = async (poolId: string) => {
    if (!userData?.uid || !currentUser) return;

    setClaimingPool(poolId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/claimPoolIncome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ poolId })
      });

      if (!response.ok) {
        throw new Error('Failed to claim income');
      }

      alert('Income claimed successfully!');
    } catch (error) {
      console.error('Error claiming income:', error);
      alert('Failed to claim income. Please try again.');
    } finally {
      setClaimingPool(null);
    }
  };

  // Set up real-time listeners
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Listen to user document for wallet balances
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', userData.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setWalletData(prev => ({
            ...prev,
            availableBalance: data.availableBalance || 0,
            lockedBalance: data.lockedBalance || 0,
            directReferralsCount: data.directReferralsCount || 0,
          }));
        }
      }
    );
    unsubscribers.push(userUnsubscribe);

    // Listen to transactions
    const transactionsUnsubscribe = onSnapshot(
      query(
        collection(db, 'transactions'),
        where('uid', '==', userData.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      ),
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setRecentTransactions(transactions);
      }
    );
    unsubscribers.push(transactionsUnsubscribe);

    // Listen to income pools
    const poolsUnsubscribe = onSnapshot(
      query(
        collection(db, 'incomePools'),
        where('userUID', '==', userData.uid),
        where('canClaim', '==', true)
      ),
      (snapshot) => {
        const pools = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as IncomePool[];
        setIncomePools(pools);
        
        // Calculate locked balance from pools
        const totalLockedBalance = pools.reduce((sum, pool) => sum + pool.poolIncome, 0);
        setWalletData(prev => ({
          ...prev,
          lockedBalance: totalLockedBalance
        }));
      }
    );
    unsubscribers.push(poolsUnsubscribe);

    setLoading(false);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userData?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-gray-600">
            Manage your available and locked balances
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Unlock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletData.availableBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Lock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Locked Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletData.lockedBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Waiting for referrals</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletData.totalEarnings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletData.availableBalance + walletData.lockedBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Available + Locked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={handleWithdraw}
            disabled={walletData.availableBalance <= 0}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Withdraw Funds
          </button>
          <button
            onClick={() => navigate('/global-income')}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            View Income Pools
          </button>
        </div>

        {/* Claimable Income Pools */}
        {incomePools.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Claimable Income</h2>
              <p className="text-sm text-gray-600 mt-1">
                Income pools ready to be claimed to your available balance
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {incomePools.map((pool) => (
                  <div key={pool.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Unlock className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-900">{pool.rank} Pool</h3>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(pool.poolIncome)} ready to claim
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaimIncome(pool.id)}
                      disabled={claimingPool === pool.id}
                      className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {claimingPool === pool.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Claim
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Your latest wallet activity
            </p>
          </div>
          <div className="p-6">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                <p className="text-gray-600">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.type)}
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-900">
                          {getTransactionLabel(transaction.type)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {transaction.description || formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Balance Explanation */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Understanding Your Balances</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center mb-2">
                <Unlock className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-medium text-blue-900">Available Balance</h4>
              </div>
              <p className="text-sm text-blue-800">
                Funds that are ready to be withdrawn to your external wallet or bank account.
                This includes claimed income and referral bonuses.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-2">
                <Lock className="w-5 h-5 text-yellow-600 mr-2" />
                <h4 className="font-medium text-blue-900">Locked Balance</h4>
              </div>
              <p className="text-sm text-blue-800">
                Income generated from your rank pools that requires {incomePools[0]?.requiredDirectReferrals || 2} direct referrals 
                to unlock. Once you meet the requirement, you can claim this income.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewWalletPage;