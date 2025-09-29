import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  runTransaction,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon
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
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  processedBy?: string;
  notes?: string;
  userEmail?: string;
  userName?: string;
}

export default function AdminWithdrawalPanel() {
  const { currentUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'withdrawals'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const withdrawalData: WithdrawalData[] = [];
      snapshot.forEach((doc) => {
        withdrawalData.push({ id: doc.id, ...doc.data() } as WithdrawalData);
      });
      setWithdrawals(withdrawalData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleApprove = async (withdrawal: WithdrawalData) => {
    if (!currentUser) return;
    
    setProcessing(withdrawal.id);
    try {
      await runTransaction(db, async (transaction) => {
        // Get user document
        const userRef = doc(db, 'users', withdrawal.userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentLockedBalance = userData.lockedBalance || 0;

        // Validate locked balance
        if (currentLockedBalance < withdrawal.amountRequested) {
          throw new Error('Insufficient locked balance');
        }

        // Update user's locked balance
        transaction.update(userRef, {
          lockedBalance: currentLockedBalance - withdrawal.amountRequested
        });

        // Update withdrawal status
        const withdrawalRef = doc(db, 'withdrawals', withdrawal.id);
        transaction.update(withdrawalRef, {
          status: 'approved',
          approvedAt: serverTimestamp(),
          processedBy: currentUser.uid,
          notes: notes[withdrawal.id] || 'Approved by admin'
        });
      });

      alert('Withdrawal approved successfully!');
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Error approving withdrawal: ' + (error as Error).message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawal: WithdrawalData) => {
    if (!currentUser) return;
    
    const rejectNotes = notes[withdrawal.id] || '';
    if (!rejectNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(withdrawal.id);
    try {
      await runTransaction(db, async (transaction) => {
        // Get user document
        const userRef = doc(db, 'users', withdrawal.userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentAvailableBalance = userData.availableBalance || 0;
        const currentLockedBalance = userData.lockedBalance || 0;

        // Validate locked balance
        if (currentLockedBalance < withdrawal.amountRequested) {
          throw new Error('Insufficient locked balance');
        }

        // Return funds to available balance and reduce locked balance
        transaction.update(userRef, {
          availableBalance: currentAvailableBalance + withdrawal.amountRequested,
          lockedBalance: currentLockedBalance - withdrawal.amountRequested
        });

        // Update withdrawal status
        const withdrawalRef = doc(db, 'withdrawals', withdrawal.id);
        transaction.update(withdrawalRef, {
          status: 'rejected',
          approvedAt: serverTimestamp(),
          processedBy: currentUser.uid,
          notes: rejectNotes
        });
      });

      alert('Withdrawal rejected and funds returned to user');
      setNotes(prev => ({ ...prev, [withdrawal.id]: '' }));
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      alert('Error rejecting withdrawal: ' + (error as Error).message);
    } finally {
      setProcessing(null);
    }
  };

  const formatUSDT = (amount: number) => {
    return `${amount.toFixed(2)} USDT`;
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <CurrencyDollarIcon className="w-6 h-6" />
          Pending Withdrawals
        </h1>
        <div className="text-sm text-slate-400">
          {withdrawals.length} pending request{withdrawals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-8 text-center backdrop-blur-sm border border-slate-700/50">
          <ClockIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Pending Withdrawals</h3>
          <p className="text-slate-400">All withdrawal requests have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Withdrawal Details */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      Withdrawal Request
                    </h3>
                    <span className="text-xs text-slate-400">
                      {formatDate(withdrawal.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">User ID</label>
                      <p className="text-white font-mono text-sm">{withdrawal.userId}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">Requested Amount</label>
                      <p className="text-white font-semibold">{formatUSDT(withdrawal.amountRequested)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">Fee ({withdrawal.feePercent}%)</label>
                      <p className="text-red-400 font-semibold">-{formatUSDT(withdrawal.feeAmount)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">Net Amount</label>
                      <p className="text-green-400 font-semibold">{formatUSDT(withdrawal.amountToSend)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide">BEP20 Address</label>
                    <p className="text-white font-mono text-sm break-all bg-slate-800/50 p-2 rounded border">
                      {withdrawal.address}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      value={notes[withdrawal.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [withdrawal.id]: e.target.value }))}
                      placeholder="Add notes (required for rejection)"
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/30 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(withdrawal)}
                      disabled={processing === withdrawal.id}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded font-medium transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {processing === withdrawal.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleReject(withdrawal)}
                      disabled={processing === withdrawal.id}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded font-medium transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {processing === withdrawal.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}