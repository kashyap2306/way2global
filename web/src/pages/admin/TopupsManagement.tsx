import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  UserIcon,
  CreditCardIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowPathIcon,
  EyeIcon,
  CalendarIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { adminService, type TopupRequest } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const TopupsManagement: React.FC = () => {
  const { userData } = useAuth();
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [filteredTopups, setFilteredTopups] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [topupsPerPage] = useState(12);
  const [sortBy, setSortBy] = useState<'amount' | 'createdAt' | 'userName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchTopups();
  }, []);

  useEffect(() => {
    filterTopups();
  }, [topups, statusFilter, searchTerm, sortBy, sortOrder]);

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

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(topup => 
        topup.userName?.toLowerCase().includes(term) ||
        topup.userEmail?.toLowerCase().includes(term) ||
        topup.userId.toLowerCase().includes(term) ||
        topup.transactionId?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(topup => topup.status === statusFilter);
    }

    // Sort topups
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

    setFilteredTopups(filtered);
    setCurrentPage(1); // Reset to first page when filtering
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

  const getRankBadge = (rank: string) => {
    const colors = {
      'Bronze': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Silver': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'Gold': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Platinum': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Diamond': 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[rank as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
        {rank}
      </span>
    );
  };

  // Pagination calculations
  const indexOfLastTopup = currentPage * topupsPerPage;
  const indexOfFirstTopup = indexOfLastTopup - topupsPerPage;
  const currentTopups = filteredTopups.slice(indexOfFirstTopup, indexOfLastTopup);
  const totalPages = Math.ceil(filteredTopups.length / topupsPerPage);

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
          <p className="text-gray-300">Loading topup requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
              <CreditCardIcon className="h-6 w-6 text-purple-400" />
            </div>
            Topup Requests Management
          </h1>
          <p className="text-gray-300">Review and process ID activation requests</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-black/20 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <TableCellsIcon className="h-4 w-4" />
            </button>
          </div>
          
          <button 
            onClick={fetchTopups}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ArrowPathIcon className="h-4 w-4" />
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
                {topups.filter(t => t.status === 'pending').length}
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
                {topups.filter(t => t.status === 'approved').length}
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
                {topups.filter(t => t.status === 'rejected').length}
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
                ${topups.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
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
              placeholder="Search topup requests..."
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
              {filteredTopups.length} of {topups.length} requests
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="space-y-6">
          {/* Grid Cards */}
          {currentTopups.length === 0 ? (
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Topup Requests Found</h3>
              <p className="text-gray-400">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} requests match your search criteria.`
                  : 'No topup requests available at the moment.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {currentTopups.map((topup) => (
                <div key={topup.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-medium text-lg">
                          {topup.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors">
                          {topup.userName || 'Unknown User'}
                        </h3>
                        <p className="text-gray-400 text-xs">{topup.userEmail}</p>
                      </div>
                    </div>
                    {getStatusBadge(topup.status)}
                  </div>

                  {/* Amount & Rank */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <BanknotesIcon className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Amount</span>
                      </div>
                      <p className="text-white font-bold text-lg">${topup.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <ShieldCheckIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Rank</span>
                      </div>
                      <div className="mt-1">{getRankBadge(topup.rank)}</div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-black/20 rounded-lg p-3 border border-white/5 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCardIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Payment Details</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white text-sm">{topup.paymentMethod || 'N/A'}</p>
                      {topup.transactionId && (
                        <p className="text-xs text-gray-400 font-mono">
                          TX: {topup.transactionId.substring(0, 16)}...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center space-x-2 mb-4 text-xs text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{topup.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTopup(topup);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 bg-gray-600/50 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-gray-500/30"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View
                    </button>
                    {topup.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTopup(topup);
                            setShowApproveModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTopup(topup);
                            setShowRejectModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
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
                    Rank
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
                    Payment Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentTopups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCardIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No Topup Requests Found</h3>
                      <p className="text-gray-400">
                        {statusFilter !== 'all' 
                          ? `No ${statusFilter} requests match your search criteria.`
                          : 'No topup requests available at the moment.'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentTopups.map((topup) => (
                    <tr key={topup.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {topup.userName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {topup.userName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-400">
                              {topup.userEmail}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {topup.userId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          ${topup.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRankBadge(topup.rank)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(topup.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {topup.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          <div className="flex items-center space-x-1">
                            <CreditCardIcon className="h-4 w-4" />
                            <span>{topup.paymentMethod || 'N/A'}</span>
                          </div>
                          {topup.transactionId && (
                            <div className="text-xs text-gray-400 mt-1">
                              TX: {topup.transactionId.substring(0, 10)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTopup(topup);
                              setShowDetailsModal(true);
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <EyeIcon className="h-3 w-3" />
                            View
                          </button>
                          {topup.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTopup(topup);
                                  setShowApproveModal(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                              >
                                <CheckCircleIcon className="h-3 w-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTopup(topup);
                                  setShowRejectModal(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                              >
                                <XCircleIcon className="h-3 w-3" />
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
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="text-sm text-gray-400">
          Showing {((currentPage - 1) * topupsPerPage) + 1} to {Math.min(currentPage * topupsPerPage, filteredTopups.length)} of {filteredTopups.length} requests
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
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
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <InformationCircleIcon className="h-6 w-6 text-blue-400" />
                Topup Request Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Information */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-purple-400" />
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <p className="text-white font-medium">{selectedTopup.userName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white font-medium">{selectedTopup.userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">User ID</label>
                    <p className="text-white font-mono text-sm">{selectedTopup.userId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Current Rank</label>
                    <div className="mt-1">{getRankBadge(selectedTopup.rank)}</div>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-green-400" />
                  Transaction Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Amount</label>
                    <p className="text-white font-bold text-xl">${selectedTopup.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedTopup.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Payment Method</label>
                    <p className="text-white font-medium">{selectedTopup.paymentMethod || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Transaction ID</label>
                    <p className="text-white font-mono text-sm break-all">{selectedTopup.transactionId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Created Date</label>
                    <p className="text-white font-medium">{selectedTopup.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</p>
                  </div>
                  {selectedTopup.processedAt && (
                    <div>
                      <label className="text-sm text-gray-400">Processed Date</label>
                      <p className="text-white font-medium">{selectedTopup.processedAt?.toDate?.()?.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(selectedTopup.transactionId) && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-yellow-400" />
                    Transaction Details
                  </h3>
                  {selectedTopup.transactionId && (
                    <div className="mb-3">
                      <label className="text-sm text-gray-400">Transaction ID</label>
                      <p className="text-white bg-black/20 rounded-lg p-3 mt-1 font-mono text-sm">{selectedTopup.transactionId}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedTopup.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowApproveModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    Approve Request
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    Reject Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Showing {indexOfFirstTopup + 1} to {Math.min(indexOfLastTopup, filteredTopups.length)} of {filteredTopups.length} requests
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
      {showApproveModal && selectedTopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
                Approve Request
              </h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-black/20 border border-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  Request Summary
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">User:</span>
                    <span className="text-white font-medium">{selectedTopup.userName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{selectedTopup.userEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-green-400 font-bold text-lg">${selectedTopup.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rank:</span>
                    <div>{getRankBadge(selectedTopup.rank)}</div>
                  </div>
                  {selectedTopup.paymentMethod && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Payment Method:</span>
                      <span className="text-white">{selectedTopup.paymentMethod}</span>
                    </div>
                  )}
                  {selectedTopup.transactionId && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-400">Transaction ID:</span>
                      <span className="text-white text-xs font-mono break-all max-w-[150px]">{selectedTopup.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-semibold mb-1">Confirmation Required</p>
                    <p className="text-yellow-200 text-sm leading-relaxed">
                      This action will activate the user's account and credit <span className="font-semibold">${selectedTopup.amount.toLocaleString()}</span> to their balance. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 bg-gray-600/50 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 border border-gray-500/30"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveTopup}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Approve Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Reject Topup Request</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Request Summary */}
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Request Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">User:</span>
                  <span className="text-white font-medium">{selectedTopup.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-medium">${selectedTopup.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white font-medium">{selectedTopup.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white font-medium">
                    {selectedTopup.createdAt?.toDate?.()?.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Rejection Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                placeholder="Please provide a detailed reason for rejecting this topup request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
              />
              {!rejectionReason.trim() && (
                <p className="text-red-400 text-xs mt-1">Rejection reason is required</p>
              )}
            </div>
            
            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-red-400 font-medium text-sm">Confirmation Required</h4>
                  <p className="text-red-300 text-sm mt-1">
                    This action will permanently reject the topup request. The user will be notified of the rejection and the provided reason.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTopup}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg"
              >
                {processing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Rejecting...</span>
                  </div>
                ) : (
                  'Reject Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopupsManagement;