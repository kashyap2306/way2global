import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { adminService, type AdminUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const UsersManagement: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Enhanced edit form state with all user details
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    contact: '',
    rank: '',
    status: '',
    balance: 0,
    directReferrals: 0,
    userCode: '',
    isActive: true
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'balance' | 'createdAt' | 'userCode'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, rankFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter - enhanced to include userCode
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.userCode?.toLowerCase().includes(term) ||
        user.contact?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Rank filter
    if (rankFilter !== 'all') {
      filtered = filtered.filter(user => user.rank === rankFilter);
    }

    // Sort users
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.displayName?.toLowerCase() || '';
          bValue = b.displayName?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'balance':
          aValue = a.balance || 0;
          bValue = b.balance || 0;
          break;
        case 'userCode':
          aValue = a.userCode?.toLowerCase() || '';
          bValue = b.userCode?.toLowerCase() || '';
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

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Helper function to find user document ID by userCode
  const findUserDocIdByUserCode = async (userCode: string): Promise<string | null> => {
    try {
      const usersSnapshot = await adminService.getAllUsers();
      const user = usersSnapshot.find(u => u.userCode === userCode);
      return user?.uid || null;
    } catch (error) {
      console.error('Error finding user by userCode:', error);
      return null;
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspensionReason.trim()) return;

    try {
      setProcessing(true);
      
      // Find user document ID by userCode if available, otherwise use uid
      const userDocId = selectedUser.userCode 
        ? await findUserDocIdByUserCode(selectedUser.userCode) || selectedUser.uid
        : selectedUser.uid;
      
      await adminService.suspendUser(
        userDocId, 
        suspensionReason, 
        userData!.uid, 
        userData!.email
      );
      await fetchUsers();
      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspensionReason('');
    } catch (error) {
      console.error('Error suspending user:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      
      // Find user document ID by userCode if available, otherwise use uid
      const userDocId = selectedUser.userCode 
        ? await findUserDocIdByUserCode(selectedUser.userCode) || selectedUser.uid
        : selectedUser.uid;
      
      await adminService.reactivateUser(
        userDocId, 
        userData!.uid, 
        userData!.email
      );
      await fetchUsers();
      setShowReactivateModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error reactivating user:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      displayName: user.displayName || '',
      email: user.email || '',
      contact: user.contact || '',
      rank: user.rank || '',
      status: user.status || '',
      balance: user.balance || 0,
      directReferrals: user.directReferrals || 0,
      userCode: user.userCode || '',
      isActive: user.isActive ?? true
    });
    setShowEditModal(true);
  };

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      
      // Find user document ID by userCode if available, otherwise use uid
      const userDocId = selectedUser.userCode 
        ? await findUserDocIdByUserCode(selectedUser.userCode) || selectedUser.uid
        : selectedUser.uid;
      
      await adminService.updateUser(
        userDocId,
        editForm,
        userData!.uid,
        userData!.email
      );
      await fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({
        displayName: '',
        email: '',
        contact: '',
        rank: '',
        status: '',
        balance: 0,
        directReferrals: 0,
        userCode: '',
        isActive: true
      });
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            Unknown
          </span>
        );
    }
  };

  const getRankBadge = (rank: string) => {
    const colors = {
      'Starter': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'Bronze': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Silver': 'bg-gray-400/20 text-gray-300 border-gray-400/30',
      'Gold': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Platinum': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Diamond': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Crown': 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[rank as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
        {rank}
      </span>
    );
  };

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
          <p className="text-gray-300">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-gray-300">Comprehensive user account management and administration</p>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-4 lg:mt-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-xs text-gray-400">Total Users</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.status === 'active').length}</div>
            <div className="text-xs text-gray-400">Active</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{users.filter(u => u.status === 'suspended').length}</div>
            <div className="text-xs text-gray-400">Suspended</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{users.filter(u => u.status === 'pending').length}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, user code, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Ranks</option>
              <option value="Starter">Starter</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
              <option value="Diamond">Diamond</option>
              <option value="Crown">Crown</option>
            </select>

            <button 
              onClick={fetchUsers}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Desktop Table */}
      <div className="hidden lg:block bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <UserIcon className="w-4 h-4" />
                    <span>User Details</span>
                    {sortBy === 'name' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('userCode')}
                >
                  <div className="flex items-center space-x-1">
                    <span>User Code</span>
                    {sortBy === 'userCode' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rank & Status
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('balance')}
                >
                  <div className="flex items-center space-x-1">
                    <CurrencyDollarIcon className="w-4 h-4" />
                    <span>Balance</span>
                    {sortBy === 'balance' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>Referrals</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Joined</span>
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
              {currentUsers.map((user) => (
                <tr key={user.userCode || user.uid} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.displayName || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          {user.isActive ? (
                            <ShieldCheckIcon className="w-3 h-3 text-green-400" />
                          ) : (
                            <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
                          )}
                          <span>{user.isActive ? 'Verified' : 'Unverified'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-purple-300 font-mono bg-purple-500/10 px-2 py-1 rounded">
                      {user.userCode || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {user.contact || 'Not provided'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {getRankBadge(user.rank)}
                      {getStatusBadge(user.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-lg font-bold text-green-400">
                      ${user.balance?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">
                      {user.directReferrals || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {user.activationDate?.toDate?.()?.toLocaleDateString() || user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center space-x-1"
                      >
                        <EyeIcon className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center space-x-1"
                      >
                        <PencilIcon className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowSuspendModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowReactivateModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {currentUsers.map((user) => (
          <div key={user.userCode || user.uid} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">{user.displayName || 'Unknown User'}</h3>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-purple-300 text-xs font-mono bg-purple-500/10 px-2 py-1 rounded">
                      {user.userCode || 'N/A'}
                    </span>
                    {user.isActive ? (
                      <span className="text-green-400 text-xs flex items-center space-x-1">
                        <ShieldCheckIcon className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs flex items-center space-x-1">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        <span>Unverified</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* User Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-400 block">Rank:</span>
                <div className="mt-1">{getRankBadge(user.rank)}</div>
              </div>
              <div>
                <span className="text-gray-400 block">Status:</span>
                <div className="mt-1">{getStatusBadge(user.status)}</div>
              </div>
              <div>
                <span className="text-gray-400 block">Balance:</span>
                <p className="text-green-400 font-bold text-lg">${user.balance?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-gray-400 block">Referrals:</span>
                <p className="text-white font-medium">{user.directReferrals || 0}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block">Contact:</span>
                <p className="text-white">{user.contact || 'Not provided'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block">Joined:</span>
                <p className="text-white">{user.activationDate?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleViewDetails(user)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 flex-1"
              >
                <EyeIcon className="w-4 h-4" />
                <span>View Details</span>
              </button>
              <button
                onClick={() => handleEditUser(user)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 flex-1"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit</span>
              </button>
              {user.status === 'active' ? (
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowSuspendModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors w-full"
                >
                  Suspend User
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowReactivateModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors w-full"
                >
                  Reactivate User
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Suspend User</h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to suspend <strong className="text-white">{selectedUser?.displayName}</strong>?
            </p>
            
            <textarea
              placeholder="Reason for suspension..."
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
              rows={3}
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                disabled={processing || !suspensionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                {processing ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Reactivate User</h3>
              <button
                onClick={() => setShowReactivateModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to reactivate <strong className="text-white">{selectedUser?.displayName}</strong>?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowReactivateModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivateUser}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                {processing ? 'Reactivating...' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit User Modal with All Fields */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit User Details</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    User Code
                  </label>
                  <input
                    type="text"
                    value={editForm.userCode}
                    onChange={(e) => setEditForm(prev => ({ ...prev, userCode: e.target.value }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter user code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={editForm.contact}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter contact number"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rank
                  </label>
                  <select
                    value={editForm.rank}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rank: e.target.value }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Crown">Crown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Balance ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.balance}
                    onChange={(e) => setEditForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter balance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Direct Referrals
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.directReferrals}
                    onChange={(e) => setEditForm(prev => ({ ...prev, directReferrals: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter referral count"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-black/20 border-white/10 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-300">Account Verified</span>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={processing}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                {processing ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">User Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* User Profile Header */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">{selectedUser.displayName || 'Unknown User'}</h4>
                <p className="text-gray-300">{selectedUser.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  {getRankBadge(selectedUser.rank)}
                  {getStatusBadge(selectedUser.status)}
                  {selectedUser.isActive ? (
                    <span className="text-green-400 text-sm flex items-center space-x-1">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-red-400 text-sm flex items-center space-x-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h5 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Personal Information</h5>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">User Code</label>
                    <p className="text-white font-mono bg-purple-500/10 px-3 py-2 rounded border border-purple-500/20">
                      {selectedUser.userCode || 'Not assigned'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Full Name</label>
                    <p className="text-white">{selectedUser.displayName || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Email Address</label>
                    <p className="text-white">{selectedUser.email || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Contact Number</label>
                    <p className="text-white">{selectedUser.contact || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Registration Date</label>
                    <p className="text-white">{selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Activation Date</label>
                    <p className="text-white">{selectedUser.activationDate?.toDate?.()?.toLocaleDateString() || 'Not activated'}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h5 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Account Information</h5>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">Current Balance</label>
                    <p className="text-2xl font-bold text-green-400">${selectedUser.balance?.toLocaleString() || '0'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Rank Level</label>
                    <div className="mt-1">{getRankBadge(selectedUser.rank)}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Account Status</label>
                    <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Direct Referrals</label>
                    <p className="text-xl font-semibold text-white">{selectedUser.directReferrals || 0}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Total Referrals</label>
                    <p className="text-white">{selectedUser.directReferrals || 0}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">Verification Status</label>
                    <p className={`font-medium ${selectedUser.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedUser.isActive ? 'Verified Account' : 'Unverified Account'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {selectedUser.lastLoginAt && (
              <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/10">
                <h5 className="text-lg font-semibold text-white mb-3">Additional Information</h5>
                
                {selectedUser.lastLoginAt && (
                  <div>
                    <label className="text-sm text-gray-400">Last Login</label>
                    <p className="text-white">{selectedUser.lastLoginAt?.toDate?.()?.toLocaleString() || 'Never'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditUser(selectedUser);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit User</span>
              </button>
              
              {selectedUser.status === 'active' ? (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowSuspendModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Suspend User
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowReactivateModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Reactivate User
                </button>
              )}
              
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;