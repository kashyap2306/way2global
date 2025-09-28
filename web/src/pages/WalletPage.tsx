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
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface WalletData {
  availableBalance: number;
  incomeWalletBalance: number;
  topupWalletBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalEarnings: number;
  thisMonthDeposits: number;
  thisMonthWithdrawals: number;
  thisMonthEarnings: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: Timestamp;
}

const WalletPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData>({
    availableBalance: 0,
    incomeWalletBalance: 0,
    topupWalletBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalEarnings: 0,
    thisMonthDeposits: 0,
    thisMonthWithdrawals: 0,
    thisMonthEarnings: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Format currency to USDT
  const formatUSDT = (amount: number): string => {
    return `${amount.toFixed(2)} USDT`;
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get current month start and end dates
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { startOfMonth, endOfMonth };
  };

  // Handle withdraw button click
  const handleWithdraw = () => {
    navigate('/withdrawal');
  };

  // Set up real-time listeners for wallet data
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Listen to user document for availableBalance
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', userData.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setWalletData(prev => ({
            ...prev,
            availableBalance: data.availableBalance || 0
          }));
        }
      },
      (error) => console.error('Error listening to user data:', error)
    );
    unsubscribers.push(userUnsubscribe);

    // Listen to incomeTransactions for income wallet balance
    const incomeUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', userData.uid, 'incomeTransactions'),
        where('type', '!=', 'init')
      ),
      (snapshot) => {
        let totalIncome = 0;
        const { startOfMonth } = getCurrentMonthRange();
        let thisMonthIncome = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          totalIncome += amount;

          // Check if transaction is from this month
          if (data.createdAt && data.createdAt.toDate() >= startOfMonth) {
            thisMonthIncome += amount;
          }
        });

        setWalletData(prev => ({
          ...prev,
          incomeWalletBalance: totalIncome,
          totalEarnings: totalIncome,
          thisMonthEarnings: thisMonthIncome
        }));
      },
      (error) => console.error('Error listening to income transactions:', error)
    );
    unsubscribers.push(incomeUnsubscribe);

    // Listen to transactions for topup wallet balance
    const transactionsUnsubscribe = onSnapshot(
      collection(db, 'users', userData.uid, 'transactions'),
      (snapshot) => {
        let totalDeposits = 0;
        const { startOfMonth } = getCurrentMonthRange();
        let thisMonthDeposits = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          totalDeposits += amount;

          // Check if transaction is from this month
          if (data.createdAt && data.createdAt.toDate() >= startOfMonth) {
            thisMonthDeposits += amount;
          }
        });

        setWalletData(prev => ({
          ...prev,
          topupWalletBalance: totalDeposits,
          totalDeposits: totalDeposits,
          thisMonthDeposits: thisMonthDeposits
        }));
      },
      (error) => console.error('Error listening to transactions:', error)
    );
    unsubscribers.push(transactionsUnsubscribe);

    // Listen to withdrawals for withdrawal statistics
    const withdrawalsUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', userData.uid, 'withdrawals'),
        where('status', '==', 'approved')
      ),
      (snapshot) => {
        let totalWithdrawals = 0;
        const { startOfMonth } = getCurrentMonthRange();
        let thisMonthWithdrawals = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amountAfterFee || 0;
          totalWithdrawals += amount;

          // Check if withdrawal is from this month
          if (data.createdAt && data.createdAt.toDate() >= startOfMonth) {
            thisMonthWithdrawals += amount;
          }
        });

        setWalletData(prev => ({
          ...prev,
          totalWithdrawals: totalWithdrawals,
          thisMonthWithdrawals: thisMonthWithdrawals
        }));
      },
      (error) => console.error('Error listening to withdrawals:', error)
    );
    unsubscribers.push(withdrawalsUnsubscribe);

    // Listen to recent transactions for the table
    const recentTransactionsUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', userData.uid, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(10)
      ),
      (snapshot) => {
        const transactions: Transaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          transactions.push({
            id: doc.id,
            amount: data.amount || 0,
            type: data.type || 'deposit',
            status: data.status || 'pending',
            createdAt: data.createdAt
          });
        });
        setRecentTransactions(transactions);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to recent transactions:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(recentTransactionsUnsubscribe);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userData?.uid]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Wallet</h1>
          <p className="text-slate-300">Manage your digital assets</p>
        </div>

        {/* Main Balance Card - Digital Wallet Style */}
        <div className="relative">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
          
          {/* Main wallet card */}
          <div className="relative bg-gradient-to-br from-slate-800/90 via-blue-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl">
            {/* Card header with wallet icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                  <WalletIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Available Balance</h2>
                  <p className="text-slate-400 text-sm">Ready for withdrawal</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider">USDT</div>
              </div>
            </div>

            {/* Balance display */}
            <div className="text-center mb-8">
              <div className="text-5xl sm:text-6xl font-bold text-white mb-2 tracking-tight">
                {walletData.availableBalance.toFixed(2)}
              </div>
              <div className="text-slate-300 text-lg">USDT</div>
            </div>

            {/* Withdraw button */}
            <div className="flex justify-center">
              <button
                onClick={handleWithdraw}
                className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-12 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <div className="flex items-center space-x-3">
                  <ArrowUpIcon className="h-6 w-6 transform group-hover:translate-y-1 transition-transform" />
                  <span className="text-lg">Withdraw Funds</span>
                </div>
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
              </button>
            </div>

            {/* Card decorative elements */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800/80 to-blue-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <ArrowDownIcon className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-slate-300 text-sm">Total Income</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatUSDT(walletData.incomeWalletBalance)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <WalletIcon className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-slate-300 text-sm">Topup Balance</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatUSDT(walletData.topupWalletBalance)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/80 to-emerald-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <ArrowUpIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-slate-300 text-sm">Total Withdrawn</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatUSDT(walletData.totalWithdrawals)}</div>
          </div>
        </div>

      {/* Wallet Statistics */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Wallet Statistics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">Total Deposits:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.totalDeposits)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">Total Withdrawals:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.totalWithdrawals)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300 text-sm sm:text-base">Total Earnings:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.totalEarnings)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">This Month Deposits:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.thisMonthDeposits)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">This Month Withdrawals:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.thisMonthWithdrawals)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300 text-sm sm:text-base">This Month Earnings:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.thisMonthEarnings)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {transaction.createdAt ? formatDate(transaction.createdAt) : 'N/A'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300 capitalize">
                      {transaction.type}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {formatUSDT(transaction.amount)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed' || transaction.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-slate-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

export default WalletPage;