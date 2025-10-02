import React, { useState, useEffect, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import { getFunctions } from 'firebase/functions';

const functionsInstance = getFunctions();


interface WalletData {
  availableBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  poolIncomeEarned: number;
  directReferrals: number;
  claimEligible: boolean;
  rankBalances: { [rank: string]: number };
  thisMonthEarnings: number;
  thisMonthWithdrawals: number;
  claimableIncome: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: Timestamp;
  claimable?: boolean;
  claimed?: boolean;
}

const WalletPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData>({
    availableBalance: 0,
    lockedBalance: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    poolIncomeEarned: 0,
    directReferrals: 0,
    claimEligible: false,
    rankBalances: {},
    thisMonthEarnings: 0,
    thisMonthWithdrawals: 0,
    claimableIncome: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fund Transfer states
  const [recipientUserCode, setRecipientUserCode] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);



   const { currentUser, loading: authLoading, error: authError } = useAuth();

  
   // Handle fund transfer
  const handleFundTransfer = useCallback(async () => {
    if (!userData?.uid) {
      setTransferError('You must be logged in to transfer funds.');
      return;
    }

    if (!recipientUserCode) {
      setTransferError('Please enter a recipient user code.');
      return;
    }

    const amount = parseFloat(transferAmount as string);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount to transfer.');
      return;
    }

    if (amount > walletData.lockedBalance) {
      setTransferError('Insufficient funding wallet balance.');
      return;
    }

    setIsTransferring(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const idToken = await currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication token not found.');
      }

      const response = await fetch('https://us-central1-way-to-globe.cloudfunctions.net/transferFunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data: { recipientUserCode, amount } }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.data?.message || 'Failed to transfer funds.');
      }

      setTransferSuccess(result.data?.message || 'Funds transferred successfully!');
      setRecipientUserCode('');
      setTransferAmount('');
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      setTransferError(error.message || 'An unexpected error occurred during fund transfer.');
    }
    finally {
      setIsTransferring(false);
    }
  }, [userData?.uid, recipientUserCode, transferAmount, walletData.lockedBalance, currentUser]);



  // Format currency to USDT
  const formatUSDT = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0.00 USDT';
    }
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

  // Handle claim income button click
  const handleClaimIncome = async () => {
    if (!userData?.uid) return;

    try {
      // Import the claimIncome function from firestoreService
      const { claimIncome } = await import('../services/firestoreService');
      await claimIncome(userData.uid);
      alert('Income claimed successfully!');
    } catch (error) {
      console.error('Error claiming income:', error);
      alert('Failed to claim income. Please try again.');
    }
  };

  // Set up real-time listeners for wallet data
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Listen to user document for balance and referral data
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', userData.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setWalletData(prev => ({
            ...prev,
            availableBalance: data.availableBalance || 0,
            lockedBalance: data.lockedBalance || 0,
            totalEarnings: data.totalEarnings || 0,
            poolIncomeEarned: data.poolIncomeEarned || 0,
            directReferrals: data.directReferrals || 0,
            claimEligible: data.claimEligible || false,
            rankBalances: data.rankBalances || {}
          }));
        }
      },
      (error) => console.error('Error listening to user data:', error)
    );
    unsubscribers.push(userUnsubscribe);

    // Listen to incomeTransactions for pool and referral income
    const incomeUnsubscribe = onSnapshot(
      query(
        collection(db, 'incomeTransactions'),
        where('uid', '==', userData.uid),
        where('type', 'in', ['pool', 'referral'])
      ),
      (snapshot) => {
        let claimableIncome = 0;
        const { startOfMonth } = getCurrentMonthRange();
        let thisMonthIncome = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;

          // Count claimable income
          if (data.claimable && !data.claimed) {
            claimableIncome += amount;
          }

          // Check if transaction is from this month
          if (data.createdAt && data.createdAt.toDate() >= startOfMonth) {
            thisMonthIncome += amount;
          }
        });

        setWalletData(prev => ({
          ...prev,
          claimableIncome,
          thisMonthEarnings: thisMonthIncome
        }));
      },
      (error) => console.error('Error listening to income transactions:', error)
    );
    unsubscribers.push(incomeUnsubscribe);

    // Listen to withdrawals for withdrawal statistics
    const withdrawalsUnsubscribe = onSnapshot(
      query(
        collection(db, 'withdrawals'),
        where('uid', '==', userData.uid),
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
        collection(db, 'transactions'),
        where('uid', '==', userData.uid),
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
            createdAt: data.createdAt,
            claimable: data.claimable || false,
            claimed: data.claimed || false
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

        {/* Dual Balance Cards - Available and Locked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Balance Card */}
          <div className="relative">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
            
            {/* Available balance card */}
            <div className="relative bg-gradient-to-br from-slate-800/90 via-blue-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <WalletIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Available Balance</h2>
                    <p className="text-slate-400 text-xs">Ready for withdrawal</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">USDT</div>
              </div>

              {/* Balance display */}
              <div className="text-center mb-6">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
                  {walletData.availableBalance.toFixed(2)}
                </div>
                <div className="text-slate-300 text-sm">USDT</div>
              </div>

              {/* Withdraw button */}
              <div className="flex justify-center">
                <button
                  onClick={handleWithdraw}
                  className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowUpIcon className="h-5 w-5 transform group-hover:translate-y-1 transition-transform" />
                    <span>Withdraw</span>
                  </div>
                </button>
              </div>



              {/* Decorative elements */}
              <div className="absolute top-3 right-3 w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl"></div>
            </div>
          </div>

          {/* Funding Wallet Card */}
          <div className="relative">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur-xl"></div>
            
            {/* Locked balance card */}
            <div className="relative bg-gradient-to-br from-slate-800/90 via-orange-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                    <WalletIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Funding Wallet</h2>
                    <p className="text-slate-400 text-xs">Pool income earned</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">USDT</div>
              </div>

              {/* Balance display */}
              <div className="text-center mb-6">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
                  {walletData.lockedBalance.toFixed(2)}
                </div>
                <div className="text-slate-300 text-sm">USDT</div>
              </div>

              {/* Claim button - only show if eligible */}
              <div className="flex justify-center">

              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowFundTransfer(!showFundTransfer)}
                  className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold text-lg transition-colors duration-200"
                >
                  Fund Transfer
                </button>
              </div>

              {showFundTransfer && (
                <div className="mt-8 p-6 bg-slate-800 rounded-xl shadow-lg">
                  <h3 className="text-xl font-bold text-white mb-4">Fund Transfer</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="recipientUserCode" className="block text-sm font-medium text-slate-300 mb-1">Recipient User Code</label>
                    <input
                      type="text"
                      id="recipientUserCode"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter recipient's user code"
                      value={recipientUserCode}
                      onChange={(e) => setRecipientUserCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="transferAmount" className="block text-sm font-medium text-slate-300 mb-1">Amount (USDT)</label>
                    <input
                      type="number"
                      id="transferAmount"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter amount to transfer"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleFundTransfer}
                    disabled={isTransferring}
                    className="w-full group relative bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTransferring ? 'Transferring...' : 'Transfer Funds'}
                  </button>
                  {transferError && <p className="text-red-500 text-sm mt-2">Error: {transferError}</p>}
                  {transferSuccess && <p className="text-green-500 text-sm mt-2">{transferSuccess}</p>}
                </div>
              </div>
            )}



            {/* Decorative elements */}
              <div className="absolute top-3 right-3 w-12 h-12 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          
          <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <WalletIcon className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-slate-300 text-sm">Claimable Income</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatUSDT(walletData.claimableIncome)}</div>
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
              <span className="text-slate-300 text-sm sm:text-base">Available Balance:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.availableBalance)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">Funding Wallet:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.lockedBalance)}</span>
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
              <span className="text-slate-300 text-sm sm:text-base">Pool Income Earned:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.poolIncomeEarned)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-300 text-sm sm:text-base">Claimable Income:</span>
              <span className="font-semibold text-white text-sm sm:text-base">{formatUSDT(walletData.claimableIncome)}</span>
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