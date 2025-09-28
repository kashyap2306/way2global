import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, rankFilter]);

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

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.uid.toLowerCase().includes(term)
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

    setFilteredUsers(filtered);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspensionReason.trim()) return;

    try {
      setProcessing(true);
      await adminService.suspendUser(
        selectedUser.uid, 
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
      await adminService.reactivateUser(
        selectedUser.uid, 
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Suspended
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Pending
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
          <p className="text-white mt-4">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-gray-300">Manage all platform users</p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Rank Filter */}
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ranks</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-300">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Referrals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {user.uid.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRankBadge(user.rank)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ${user.balance?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {user.directReferrals || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
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

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Suspend User</h3>
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-gray-300 mb-4">
                Are you sure you want to suspend <strong>{selectedUser?.displayName}</strong>?
              </p>
              
              <textarea
                placeholder="Reason for suspension..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
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
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {processing ? 'Suspending...' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reactivate Modal */}
        {showReactivateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Reactivate User</h3>
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to reactivate <strong>{selectedUser?.displayName}</strong>?
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
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {processing ? 'Reactivating...' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;