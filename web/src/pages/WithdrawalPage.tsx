import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  WalletIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ArrowDownIcon 
} from '@heroicons/react/24/outline';

interface WithdrawalData {
  id: string;
  userId: string;
  amountRequested: number;
  feePercent: number;
  feeAmount: number;
  amountToSend: number;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  approvedAt?: any;
  processedBy?: string;
  notes?: string;
}

const WithdrawalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const FEE_PERCENT = 15;
  const MIN_WITHDRAWAL = 10;

  // Fetch user balance and withdrawal history
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAvailableBalance(userData.availableBalance || 0);
          setLockedBalance(userData.lockedBalance || 0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load balance information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Listen to withdrawal history
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(withdrawalsQuery, (snapshot) => {
      const withdrawalData: WithdrawalData[] = [];
      snapshot.forEach((doc) => {
        withdrawalData.push({ id: doc.id, ...doc.data() } as WithdrawalData);
      });
      setWithdrawals(withdrawalData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const calculateFee = (amount: number) => {
    const feeAmount = (amount * FEE_PERCENT) / 100;
    const amountToSend = amount - feeAmount;
    return { feeAmount, amountToSend };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const withdrawalAmount = parseFloat(amount);
      
      // Validation
      if (withdrawalAmount < MIN_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal amount is ${MIN_WITHDRAWAL} USDT`);
      }
      
      if (withdrawalAmount > availableBalance) {
        throw new Error('Insufficient balance');
      }

      if (!address.trim()) {
        throw new Error('USDT BEP20 address is required');
      }

      // BEP20 address validation (basic)
      if (!address.startsWith('0x') || address.length !== 42) {
        throw new Error('Invalid BEP20 address format');
      }

      const { feeAmount, amountToSend } = calculateFee(withdrawalAmount);

      // Use Firestore transaction to ensure atomicity
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentAvailable = userData.availableBalance || 0;
        
        if (withdrawalAmount > currentAvailable) {
          throw new Error('Insufficient balance');
        }

        // Update user balances
        transaction.update(userRef, {
          availableBalance: currentAvailable - withdrawalAmount,
          lockedBalance: (userData.lockedBalance || 0) + withdrawalAmount
        });

        // Create withdrawal record
        const withdrawalRef = doc(collection(db, 'withdrawals'));
        transaction.set(withdrawalRef, {
          userId: currentUser.uid,
          amountRequested: withdrawalAmount,
          feePercent: FEE_PERCENT,
          feeAmount: feeAmount,
          amountToSend: amountToSend,
          address: address.trim(),
          status: 'pending',
          createdAt: serverTimestamp(),
          approvedAt: null,
          processedBy: null,
          notes: null
        });
      });

      setSuccess('Withdrawal request submitted and pending admin approval.');
      setAmount('');
      setAddress('');
      
    } catch (error: any) {
      setError(error.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatUSDT = (amount: number) => {
    return `${amount.toFixed(2)} USDT`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-slate-700 rounded mb-6"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <WalletIcon className="w-6 h-6" />
          USDT Withdrawal
        </h1>
      </div>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-200">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-200">{success}</span>
        </div>
      )}
      
      {/* Available Balance */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-xl shadow-lg p-6 text-white backdrop-blur-sm border border-green-500/20 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Available for Withdrawal</h3>
            <p className="text-2xl sm:text-3xl font-bold">{formatUSDT(availableBalance)}</p>
            <p className="text-green-100 text-sm mt-2">Locked Balance: {formatUSDT(lockedBalance)}</p>
          </div>
          <ArrowDownIcon className="w-12 h-12 text-green-200 opacity-50" />
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-6">Request USDT Withdrawal</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">
              Withdrawal Amount (USDT)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (Min: ${MIN_WITHDRAWAL} USDT)`}
              min={MIN_WITHDRAWAL}
              max={availableBalance}
              step="0.01"
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 disabled:opacity-50"
            />
            {amount && parseFloat(amount) >= MIN_WITHDRAWAL && (
              <div className="mt-2 text-sm text-slate-300">
                <p>Fee ({FEE_PERCENT}%): {formatUSDT(calculateFee(parseFloat(amount)).feeAmount)}</p>
                <p className="font-semibold text-green-400">
                  You will receive: {formatUSDT(calculateFee(parseFloat(amount)).amountToSend)}
                </p>
              </div>
            )}
          </div>

          {/* USDT BEP20 Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">
              USDT BEP20 Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... (BEP20 Address)"
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              submitting || 
              !amount || 
              parseFloat(amount) < MIN_WITHDRAWAL || 
              parseFloat(amount) > availableBalance ||
              !address.trim()
            }
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <ArrowDownIcon className="w-5 h-5" />
                Request Withdrawal
              </>
            )}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Withdrawal History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600/50">
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Date</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Requested</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Fee</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Net Amount</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Address</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Status</th>
                <th className="text-left py-3 px-2 text-slate-300 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-2 text-slate-300">
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="py-3 px-2 text-white font-medium">
                      {formatUSDT(withdrawal.amountRequested)}
                    </td>
                    <td className="py-3 px-2 text-red-400">
                      -{formatUSDT(withdrawal.feeAmount)}
                    </td>
                    <td className="py-3 px-2 text-green-400 font-medium">
                      {formatUSDT(withdrawal.amountToSend)}
                    </td>
                    <td className="py-3 px-2 text-slate-300 font-mono text-xs">
                      {withdrawal.address.slice(0, 6)}...{withdrawal.address.slice(-4)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusIcon(withdrawal.status)}
                    </td>
                    <td className="py-3 px-2 text-slate-400 text-xs">
                      {withdrawal.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Withdrawal Terms & Conditions</h3>
        <div className="text-slate-300 space-y-2 text-sm">
          <p>• <strong>Minimum withdrawal:</strong> {MIN_WITHDRAWAL} USDT</p>
          <p>• <strong>Fee:</strong> {FEE_PERCENT}% deduction on all withdrawals</p>
          <p>• <strong>Currency:</strong> Only USDT (BEP20) supported</p>
          <p>• <strong>Processing time:</strong> 24-48 hours after admin approval</p>
          <p>• <strong>Network:</strong> Binance Smart Chain (BEP20)</p>
          <p>• Ensure your BEP20 address is correct to avoid loss of funds</p>
          <p>• Withdrawal requests are processed manually by admin</p>
          <p>• Contact support for any withdrawal related queries</p>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalPage;