import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { adminService, type WithdrawalRequest } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const WithdrawalsManagement: React.FC = () => {
  const { userData } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const withdrawalsData = await adminService.getAllWithdrawals();
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterWithdrawals = () => {
    let filtered = [...withdrawals];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(withdrawal => withdrawal.status === statusFilter);
    }

    setFilteredWithdrawals(filtered);
  };

  const calculateFees = (amount: number) => {
    const withdrawalFee = amount * 0.15; // 15% withdrawal fee
    const fundConvert = amount * 0.10; // 10% fund convert
    const totalFee = withdrawalFee + fundConvert;
    const finalAmount = amount - totalFee;

    return {
      withdrawalFee,
      fundConvert,
      totalFee,
      finalAmount
    };
  };

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    try {
      setProcessing(true);
      await adminService.approveWithdrawal(
        selectedWithdrawal.id, 
        userData!.uid, 
        userData!.email
      );
      await fetchWithdrawals();
      setShowApproveModal(false);
      setSelectedWithdrawal(null);
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) return;

    try {
      setProcessing(true);
      await adminService.rejectWithdrawal(
        selectedWithdrawal.id, 
        rejectionReason, 
        userData!.uid, 
        userData!.email
      );
      await fetchWithdrawals();
      setShowRejectModal(false);
      setSelectedWithdrawal(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Loading withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Withdrawals Management</h1>
          <p className="text-gray-300">Review and process withdrawal requests</p>
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
              Showing {filteredWithdrawals.length} of {withdrawals.length} withdrawals
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
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
                    Referrals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredWithdrawals.map((withdrawal) => {
                  const fees = calculateFees(withdrawal.amount);
                  return (
                    <tr key={withdrawal.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {withdrawal.userName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {withdrawal.userEmail}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {withdrawal.userId.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          <div className="font-medium">${withdrawal.amount.toLocaleString()}</div>
                          {withdrawal.status === 'pending' && (
                            <div className="text-xs text-gray-400">
                              After fees: ${fees.finalAmount.toLocaleString()}
                            </div>
                          )}
                          {withdrawal.finalAmount && (
                            <div className="text-xs text-gray-400">
                              Final: ${withdrawal.finalAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {withdrawal.directReferralCount}
                          {withdrawal.directReferralCount < 2 && (
                            <div className="text-xs text-red-400">
                              Insufficient referrals
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {withdrawal.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {withdrawal.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowApproveModal(true);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowRejectModal(true);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {withdrawal.status !== 'pending' && (
                          <span className="text-gray-500 text-xs">
                            {withdrawal.status === 'approved' ? 'Processed' : 'Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Approve Withdrawal</h3>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  User: <strong>{selectedWithdrawal.userName}</strong>
                </p>
                <p className="text-gray-300 mb-2">
                  Requested Amount: <strong>${selectedWithdrawal.amount.toLocaleString()}</strong>
                </p>
                
                {(() => {
                  const fees = calculateFees(selectedWithdrawal.amount);
                  return (
                    <div className="bg-white/10 rounded-lg p-3 mb-4">
                      <h4 className="text-white font-medium mb-2">Fee Breakdown:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>Withdrawal Fee (15%):</span>
                          <span>${fees.withdrawalFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Fund Convert (10%):</span>
                          <span>${fees.fundConvert.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-300 border-t border-white/20 pt-1">
                          <span>Total Fees:</span>
                          <span>${fees.totalFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-white font-medium border-t border-white/20 pt-1">
                          <span>Final Amount:</span>
                          <span>${fees.finalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveWithdrawal}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {processing ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Reject Withdrawal</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-gray-300 mb-4">
                Are you sure you want to reject the withdrawal request from <strong>{selectedWithdrawal.userName}</strong> for <strong>${selectedWithdrawal.amount.toLocaleString()}</strong>?
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
                  onClick={handleRejectWithdrawal}
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

export default WithdrawalsManagement;