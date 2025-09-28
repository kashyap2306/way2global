import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { adminService, type TopupRequest } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const TopupsManagement: React.FC = () => {
  const { userData } = useAuth();
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [filteredTopups, setFilteredTopups] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTopups();
  }, []);

  useEffect(() => {
    filterTopups();
  }, [topups, statusFilter]);

  const fetchTopups = async () => {
    try {
      setLoading(true);
      const topupsData = await adminService.getAllTopups();
      setTopups(topupsData);
    } catch (error) {
      console.error('Error fetching topups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTopups = () => {
    let filtered = [...topups];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(topup => topup.status === statusFilter);
    }

    setFilteredTopups(filtered);
  };

  const handleApproveTopup = async () => {
    if (!selectedTopup) return;

    try {
      setProcessing(true);
      await adminService.approveTopup(
        selectedTopup.id, 
        userData!.uid, 
        userData!.email
      );
      await fetchTopups();
      setShowApproveModal(false);
      setSelectedTopup(null);
    } catch (error) {
      console.error('Error approving topup:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTopup = async () => {
    if (!selectedTopup || !rejectionReason.trim()) return;

    try {
      setProcessing(true);
      await adminService.rejectTopup(
        selectedTopup.id, 
        rejectionReason, 
        userData!.uid, 
        userData!.email
      );
      await fetchTopups();
      setShowRejectModal(false);
      setSelectedTopup(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting topup:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const getRankBadge = (rank: string) => {
    const colors = {
      'Bronze': 'bg-orange-100 text-orange-800',
      'Silver': 'bg-gray-100 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-purple-100 text-purple-800',
      'Diamond': 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[rank as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {rank}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Loading topup requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Topup Requests Management</h1>
          <p className="text-gray-300">Review and process ID activation requests</p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="text-sm text-gray-300">
              Showing {filteredTopups.length} of {topups.length} requests
            </div>
          </div>
        </div>

        {/* Topups Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Payment Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredTopups.map((topup) => (
                  <tr key={topup.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {topup.userName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {topup.userEmail}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {topup.userId.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        ${topup.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRankBadge(topup.rank)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(topup.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {topup.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        <div>Method: {topup.paymentMethod || 'N/A'}</div>
                        {topup.transactionId && (
                          <div className="text-xs text-gray-400">
                            TX: {topup.transactionId.substring(0, 10)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {topup.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTopup(topup);
                              setShowApproveModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTopup(topup);
                              setShowRejectModal(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {topup.status !== 'pending' && (
                        <span className="text-gray-500 text-xs">
                          {topup.status === 'approved' ? 'Processed' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && selectedTopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Approve Topup Request</h3>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">Request Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>User:</span>
                      <span>{selectedTopup.userName}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Email:</span>
                      <span>{selectedTopup.userEmail}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Amount:</span>
                      <span>${selectedTopup.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rank:</span>
                      <span>{selectedTopup.rank}</span>
                    </div>
                    {selectedTopup.paymentMethod && (
                      <div className="flex justify-between text-gray-300">
                        <span>Payment Method:</span>
                        <span>{selectedTopup.paymentMethod}</span>
                      </div>
                    )}
                    {selectedTopup.transactionId && (
                      <div className="flex justify-between text-gray-300">
                        <span>Transaction ID:</span>
                        <span className="text-xs">{selectedTopup.transactionId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 text-sm font-medium">Confirmation Required</p>
                      <p className="text-yellow-200 text-xs mt-1">
                        This will activate the user's ID and add the topup amount to their balance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveTopup}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {processing ? 'Approving...' : 'Approve & Activate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedTopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Reject Topup Request</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-gray-300 mb-4">
                Are you sure you want to reject the topup request from <strong>{selectedTopup.userName}</strong> for <strong>${selectedTopup.amount.toLocaleString()}</strong>?
              </p>
              
              <textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                rows={3}
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectTopup}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {processing ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopupsManagement;