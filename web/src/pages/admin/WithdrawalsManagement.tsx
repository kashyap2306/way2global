import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowPathIcon,
  BanknotesIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { adminService, type WithdrawalRequest } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const WithdrawalsManagement: React.FC = () => {
  const { userData } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [withdrawalsPerPage] = useState(12); // Changed to 12 for better grid display
  const [sortBy, setSortBy] = useState<'amount' | 'createdAt' | 'userName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, statusFilter, searchTerm, sortBy, sortOrder]);

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

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(withdrawal => 
        withdrawal.userName?.toLowerCase().includes(term) ||
        withdrawal.userEmail?.toLowerCase().includes(term) ||
        withdrawal.userId.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(withdrawal => withdrawal.status === statusFilter);
    }

    // Sort withdrawals
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'userName':
          aValue = a.userName?.toLowerCase() || '';
          bValue = b.userName?.toLowerCase() || '';
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'createdAt':
          aValue = a.createdAt?.toDate?.()?.getTime() || 0;
          bValue = b.createdAt?.toDate?.()?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredWithdrawals(filtered);
    setCurrentPage(1); // Reset to first page when filtering
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            Unknown
          </span>
        );
    }
  };

  // Pagination calculations
  const indexOfLastWithdrawal = currentPage * withdrawalsPerPage;
  const indexOfFirstWithdrawal = indexOfLastWithdrawal - withdrawalsPerPage;
  const currentWithdrawals = filteredWithdrawals.slice(indexOfFirstWithdrawal, indexOfLastWithdrawal);
  const totalPages = Math.ceil(filteredWithdrawals.length / withdrawalsPerPage);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Withdrawals Management</h1>
          <p className="text-gray-300">Review and process withdrawal requests</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4 mr-2" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <TableCellsIcon className="w-4 h-4 mr-2" />
              Table
            </button>
          </div>
          <button 
            onClick={fetchWithdrawals}
            className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Pending</p>
              <p className="text-lg font-semibold text-white">
                {withdrawals.filter(w => w.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Approved</p>
              <p className="text-lg font-semibold text-white">
                {withdrawals.filter(w => w.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Rejected</p>
              <p className="text-lg font-semibold text-white">
                {withdrawals.filter(w => w.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Total Amount</p>
              <p className="text-lg font-semibold text-white">
                ${withdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search withdrawals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-300">
            <span className="bg-purple-500/20 px-3 py-2 rounded-lg border border-purple-500/30">
              {filteredWithdrawals.length} of {withdrawals.length} withdrawals
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Grid or Table View */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentWithdrawals.map((withdrawal) => {
            const fees = calculateFees(withdrawal.amount);
            return (
              <div key={withdrawal.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 group">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {withdrawal.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm truncate max-w-[120px]">
                        {withdrawal.userName || 'Unknown User'}
                      </h3>
                      <p className="text-gray-400 text-xs truncate max-w-[120px]">
                        {withdrawal.userEmail}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedWithdrawal(withdrawal);
                      setShowDetailsModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                  >
                    <EyeIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>

                {/* Amount Section */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BanknotesIcon className="w-5 h-5 text-green-400" />
                    <span className="text-2xl font-bold text-white">
                      ${withdrawal.amount.toLocaleString()}
                    </span>
                  </div>
                  {withdrawal.status === 'pending' && (
                    <p className="text-sm text-gray-400">
                      After fees: <span className="text-green-400">${fees.finalAmount.toLocaleString()}</span>
                    </p>
                  )}
                  {withdrawal.finalAmount && (
                    <p className="text-sm text-gray-400">
                      Final: <span className="text-green-400">${withdrawal.finalAmount.toLocaleString()}</span>
                    </p>
                  )}
                </div>

                {/* Status and Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Status:</span>
                    {getStatusBadge(withdrawal.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Referrals:</span>
                    <div className="text-right">
                      <span className="text-white font-medium">{withdrawal.directReferralCount}</span>
                      {withdrawal.directReferralCount < 2 && (
                        <p className="text-xs text-red-400">Insufficient</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Date:</span>
                    <span className="text-white text-sm">
                      {withdrawal.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {withdrawal.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setShowApproveModal(true);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setShowRejectModal(true);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
                {withdrawal.status !== 'pending' && (
                  <div className="text-center py-2">
                    <span className="text-gray-500 text-sm">
                      {withdrawal.status === 'approved' ? 'Processed' : 'Rejected'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('userName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>User</span>
                        {sortBy === 'userName' && (
                          <span className="text-purple-400">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        {sortBy === 'amount' && (
                          <span className="text-purple-400">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Referrals
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        {sortBy === 'createdAt' && (
                          <span className="text-purple-400">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentWithdrawals.map((withdrawal) => {
                    const fees = calculateFees(withdrawal.amount);
                    return (
                      <tr key={withdrawal.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {withdrawal.userName?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {withdrawal.userName || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {withdrawal.userEmail}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {withdrawal.userId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                         </td>
                         <td className="px-6 py-4">
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
                         <td className="px-6 py-4">
                           <div className="text-sm text-white">
                             {withdrawal.directReferralCount}
                             {withdrawal.directReferralCount < 2 && (
                               <div className="text-xs text-red-400">
                                 Insufficient referrals
                               </div>
                             )}
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           {getStatusBadge(withdrawal.status)}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-300">
                           {withdrawal.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                         </td>
                         <td className="px-6 py-4">
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

           {/* Mobile Card View */}
           <div className="lg:hidden space-y-4">
             {currentWithdrawals.map((withdrawal) => {
               const fees = calculateFees(withdrawal.amount);
               return (
                 <div key={withdrawal.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                   <div className="flex items-start justify-between mb-3">
                     <div className="flex items-center space-x-3">
                       <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                         <span className="text-white font-medium">
                           {withdrawal.userName?.charAt(0)?.toUpperCase() || 'U'}
                         </span>
                       </div>
                       <div>
                         <h3 className="text-white font-medium">{withdrawal.userName || 'Unknown User'}</h3>
                         <p className="text-gray-400 text-sm">{withdrawal.userEmail}</p>
                         <p className="text-gray-500 text-xs">ID: {withdrawal.userId.substring(0, 8)}...</p>
                       </div>
                     </div>
                     <div className="text-right">
                       {getStatusBadge(withdrawal.status)}
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                     <div>
                       <span className="text-gray-400">Amount:</span>
                       <p className="text-white font-medium">${withdrawal.amount.toLocaleString()}</p>
                       {withdrawal.status === 'pending' && (
                         <p className="text-xs text-gray-400">After fees: ${fees.finalAmount.toLocaleString()}</p>
                       )}
                     </div>
                <div>
                  <span className="text-gray-400">Referrals:</span>
                  <p className="text-white">{withdrawal.directReferralCount}</p>
                  {withdrawal.directReferralCount < 2 && (
                    <p className="text-xs text-red-400">Insufficient</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Date:</span>
                  <p className="text-white">{withdrawal.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                </div>
              </div>

              {withdrawal.status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedWithdrawal(withdrawal);
                      setShowApproveModal(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWithdrawal(withdrawal);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-black/90 to-purple-900/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-3">
                 <div className="p-2 bg-purple-500/20 rounded-lg">
                   <EyeIcon className="w-6 h-6 text-purple-400" />
                 </div>
                 <h3 className="text-xl font-semibold text-white">Withdrawal Details</h3>
               </div>
               <button
                 onClick={() => setShowDetailsModal(false)}
                 className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
               >
                 <XMarkIcon className="h-6 w-6" />
               </button>
             </div>

             {/* User Information */}
             <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
               <h4 className="text-white font-semibold mb-3 flex items-center">
                 <UserIcon className="w-5 h-5 mr-2 text-blue-400" />
                 User Information
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <span className="text-gray-400 text-sm">Name:</span>
                   <p className="text-white font-medium">{selectedWithdrawal.userName || 'Unknown User'}</p>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">Email:</span>
                   <p className="text-white font-medium">{selectedWithdrawal.userEmail}</p>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">User ID:</span>
                   <p className="text-white font-mono text-sm">{selectedWithdrawal.userId}</p>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">Direct Referrals:</span>
                   <p className="text-white font-medium">{selectedWithdrawal.directReferralCount}</p>
                 </div>
               </div>
             </div>

             {/* Transaction Details */}
             <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
               <h4 className="text-white font-semibold mb-3 flex items-center">
                 <BanknotesIcon className="w-5 h-5 mr-2 text-green-400" />
                 Transaction Details
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <span className="text-gray-400 text-sm">Requested Amount:</span>
                   <p className="text-white font-bold text-lg">${selectedWithdrawal.amount.toLocaleString()}</p>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">Status:</span>
                   <div className="mt-1">{getStatusBadge(selectedWithdrawal.status)}</div>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">Request Date:</span>
                   <p className="text-white font-medium">
                     {selectedWithdrawal.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                   </p>
                 </div>
                 <div>
                   <span className="text-gray-400 text-sm">Request Time:</span>
                   <p className="text-white font-medium">
                     {selectedWithdrawal.createdAt?.toDate?.()?.toLocaleTimeString() || 'N/A'}
                   </p>
                 </div>
               </div>

               {/* Fee Breakdown */}
               {(() => {
                 const fees = calculateFees(selectedWithdrawal.amount);
                 return (
                   <div className="mt-4 bg-black/30 border border-white/5 rounded-lg p-4">
                     <h5 className="text-white font-medium mb-3">Fee Breakdown:</h5>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between text-gray-300">
                         <span>Withdrawal Fee (15%):</span>
                         <span>${fees.withdrawalFee.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-gray-300">
                         <span>Fund Convert (10%):</span>
                         <span>${fees.fundConvert.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-gray-300 border-t border-white/20 pt-2">
                         <span>Total Fees:</span>
                         <span>${fees.totalFee.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-white font-bold border-t border-white/20 pt-2">
                         <span>Final Amount:</span>
                         <span className="text-green-400">${fees.finalAmount.toLocaleString()}</span>
                       </div>
                     </div>
                   </div>
                 );
               })()}
             </div>

             {/* Action Buttons */}
             {selectedWithdrawal.status === 'pending' && (
               <div className="flex space-x-3">
                 <button
                   onClick={() => {
                     setShowDetailsModal(false);
                     setShowApproveModal(true);
                   }}
                   className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                 >
                   <CheckCircleIcon className="w-5 h-5" />
                   <span>Approve Withdrawal</span>
                 </button>
                 <button
                   onClick={() => {
                     setShowDetailsModal(false);
                     setShowRejectModal(true);
                   }}
                   className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                 >
                   <XCircleIcon className="w-5 h-5" />
                   <span>Reject Withdrawal</span>
                 </button>
               </div>
             )}
           </div>
         </div>
       )}
      {totalPages > 1 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Showing {indexOfFirstWithdrawal + 1} to {Math.min(indexOfLastWithdrawal, filteredWithdrawals.length)} of {filteredWithdrawals.length} withdrawals
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-black/20 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'bg-black/20 border border-white/10 text-gray-300 hover:text-white hover:bg-black/30'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 bg-black/20 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Approve Withdrawal</h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                User: <strong className="text-white">{selectedWithdrawal.userName}</strong>
              </p>
              <p className="text-gray-300 mb-2">
                Requested Amount: <strong className="text-white">${selectedWithdrawal.amount.toLocaleString()}</strong>
              </p>
              
              {(() => {
                const fees = calculateFees(selectedWithdrawal.amount);
                return (
                  <div className="bg-black/20 border border-white/10 rounded-lg p-3 mb-4">
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
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                {processing ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Reject Withdrawal</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to reject the withdrawal request from <strong className="text-white">{selectedWithdrawal.userName}</strong> for <strong className="text-white">${selectedWithdrawal.amount.toLocaleString()}</strong>?
            </p>
            
            <textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
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
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                {processing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate fees
const calculateFees = (amount: number) => {
  const withdrawalFee = amount * 0.15; // 15%
  const fundConvert = amount * 0.10; // 10%
  const totalFee = withdrawalFee + fundConvert;
  const finalAmount = amount - totalFee;
  
  return {
    withdrawalFee,
    fundConvert,
    totalFee,
    finalAmount
  };
};

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Pending' },
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Approved' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Rejected' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

export default WithdrawalsManagement;