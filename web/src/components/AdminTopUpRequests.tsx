import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CheckIcon, XMarkIcon, ClockIcon, EyeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface TopupRequest {
  id: string;
  userId: string;
  amount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
  userEmail?: string;
  userName?: string;
}

const AdminTopUpRequests: React.FC = () => {
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');

  useEffect(() => {
    setupRealTimeListener();
  }, [filter]);

  const setupRealTimeListener = () => {
    let q;
    
    if (filter === 'all') {
      q = query(
        collection(db, 'topupRequests'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'topupRequests'),
        where('status', '==', filter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData: TopupRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({
          id: doc.id,
          ...doc.data()
        } as TopupRequest);
      });
      setRequests(requestsData);
      setLoading(false);
    });

    return unsubscribe;
  };

  const handleConfirmPayment = async (requestId: string, userId: string, amount: number) => {
    if (!confirm(`Confirm payment of ${amount} USDT for this request?`)) return;

    setProcessingId(requestId);
    try {
      // Update the topup request status
      await updateDoc(doc(db, 'topupRequests', requestId), {
        status: 'confirmed'
      });

      // Update user's balance
      await updateDoc(doc(db, 'users', userId), {
        availableBalance: increment(amount)
      });

      alert('Payment confirmed successfully! User balance has been updated.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    setProcessingId(requestId);
    try {
      await updateDoc(doc(db, 'topupRequests', requestId), {
        status: 'rejected',
        rejectionReason: reason || 'No reason provided'
      });

      alert('Payment request rejected successfully.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment. Please try again.');
    } finally {
      setProcessingId(null);
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

  const getTotalAmount = () => {
    return requests.reduce((total, request) => {
      if (filter === 'all' || request.status === filter) {
        return total + request.amount;
      }
      return total;
    }, 0);
  };

  const getRequestCounts = () => {
    const counts = { pending: 0, confirmed: 0, rejected: 0, total: 0 };
    requests.forEach(request => {
      counts[request.status as keyof typeof counts]++;
      counts.total++;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const counts = getRequestCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
            Admin - Topup Requests
          </h1>
          <p className="text-sm sm:text-lg text-slate-300">
            Manage and process user topup requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-3 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-yellow-100">Pending</p>
                <p className="text-lg sm:text-2xl font-bold">{counts.pending}</p>
              </div>
              <ClockIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-green-100">Confirmed</p>
                <p className="text-lg sm:text-2xl font-bold">{counts.confirmed}</p>
              </div>
              <CheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-3 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-red-100">Rejected</p>
                <p className="text-lg sm:text-2xl font-bold">{counts.rejected}</p>
              </div>
              <XMarkIcon className="w-6 h-6 sm:w-8 sm:h-8 text-red-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-100">Total Amount</p>
                <p className="text-sm sm:text-lg font-bold">{formatCurrency(getTotalAmount())}</p>
              </div>
              <CurrencyDollarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'confirmed', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                  filter === status
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {counts[status]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/30">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">User ID</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide hidden sm:table-cell">TX Hash</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No {filter !== 'all' ? filter : ''} requests found
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
                        <div className="text-xs sm:text-sm text-slate-300 font-mono break-all max-w-xs">
                          {request.userId.substring(0, 8)}...
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
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <EyeIcon className="w-3 h-3" />
                            View
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(request.id, request.userId, request.amount)}
                                disabled={processingId === request.id}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                              >
                                {processingId === request.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                ) : (
                                  <CheckIcon className="w-3 h-3" />
                                )}
                                Confirm
                              </button>
                              <button
                                onClick={() => handleRejectPayment(request.id)}
                                disabled={processingId === request.id}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                              >
                                <XMarkIcon className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Request ID</label>
                  <p className="text-white font-mono text-sm break-all">{selectedRequest.id}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">User ID</label>
                  <p className="text-white font-mono text-sm break-all">{selectedRequest.userId}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Amount</label>
                  <p className="text-white font-semibold">{formatCurrency(selectedRequest.amount)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Transaction Hash</label>
                  <p className="text-white font-mono text-sm break-all">{selectedRequest.txHash}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Created At</label>
                  <p className="text-white">{formatDate(selectedRequest.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTopUpRequests;