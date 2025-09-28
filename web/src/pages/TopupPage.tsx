import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CurrencyDollarIcon, ClipboardDocumentIcon, CheckIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TopupRequest {
  id: string;
  userId: string;
  amount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
}

const TopupPage: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const paymentAddress = '0x4a30fD7C40Ee41bB991bf316Ec082271D6B214c9';
  const predefinedAmounts = [10, 50, 100, 500, 1000];

  useEffect(() => {
    if (currentUser) {
      setupRealTimeListener();
    }
  }, [currentUser]);

  const setupRealTimeListener = () => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'topupRequests'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData: TopupRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({
          id: doc.id,
          ...doc.data()
        } as TopupRequest);
      });
      setRequests(requestsData);
    });

    return unsubscribe;
  };

  const validateForm = () => {
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return false;
    }
    if (!txHash.trim()) {
      alert('Please enter the transaction hash');
      return false;
    }
    if (txHash.length < 10) {
      alert('Please enter a valid transaction hash');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !validateForm()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'topupRequests'), {
        userId: currentUser.uid,
        amount: parseFloat(amount),
        txHash: txHash.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setAmount('');
      setTxHash('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting topup request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(paymentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} USDT`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckIcon className="w-3 h-3 mr-1" />
            Confirmed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XMarkIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
            USDT Top-up
          </h1>
          <p className="text-sm sm:text-lg text-slate-300">
            Add USDT to your wallet via BEP-20 network
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckIcon className="w-6 h-6 text-white flex-shrink-0" />
            <div className="text-white">
              <p className="font-semibold">Request Submitted Successfully!</p>
              <p className="text-sm text-green-100">Your topup request is being processed.</p>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-white backdrop-blur-sm border border-blue-500/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-6 h-6 text-blue-200" />
            <h3 className="text-lg font-semibold">Current Balance</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            {userData?.availableBalance ? formatCurrency(userData.availableBalance) : '0.00 USDT'}
          </p>
          <p className="text-blue-100 text-sm mt-2">Available for transactions</p>
        </div>

        {/* Payment Instructions */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Instructions</h3>
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-white font-medium mb-2">Step 1: Send USDT (BEP-20)</h4>
              <p className="text-slate-300 text-sm mb-3">Send your USDT to the following address on Binance Smart Chain (BEP-20):</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={paymentAddress}
                  readOnly
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none break-all"
                />
                <button
                  onClick={copyAddress}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-white font-medium mb-2">Step 2: Submit Transaction Details</h4>
              <p className="text-slate-300 text-sm">After sending the payment, fill out the form below with the transaction hash.</p>
            </div>
          </div>
        </div>

        {/* Top-up Form */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-6">Submit Topup Request</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Predefined Amounts */}
            <div>
              <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Quick Select Amount (USDT)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {predefinedAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg border transition-all duration-300 transform hover:scale-105 text-sm font-medium ${
                      amount === amt.toString()
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg'
                        : 'bg-slate-800/50 text-slate-300 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
                    }`}
                  >
                    {amt} USDT
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Enter Amount (USDT)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in USDT"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                required
              />
            </div>

            {/* Transaction Hash */}
            <div>
              <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Paste your transaction hash here"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                required
              />
              <p className="text-xs text-slate-400 mt-2">
                You can find the transaction hash in your wallet after sending the payment
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount || !txHash || parseFloat(amount) <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                'Submit Topup Request'
              )}
            </button>
          </form>
        </div>

        {/* Recent Requests */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-green-900 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Your Topup Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/30">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide hidden sm:table-cell">TX Hash</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No topup requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2 sm:px-4">
                        <div className="text-xs sm:text-sm text-white">
                          {formatDate(request.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {formatCurrency(request.amount)}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                        <div className="text-xs text-slate-300 font-mono break-all max-w-xs">
                          {request.txHash.substring(0, 20)}...
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        {getStatusBadge(request.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopupPage;