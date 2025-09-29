import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  BanknotesIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  XMarkIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { db } from "../../config/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

interface GlobalIncomeUser {
  userCode: string;
  displayName: string;
  email: string;
  phone?: string;
  rank: string;
  level?: number;
  status: 'active' | 'inactive' | 'suspended';
  directReferrals: number;
  lastLogin?: Timestamp;
  suspensionReason?: string;
  globalIncomeData: {
    [rank: string]: {
      lockedBalance: number;
      availableBalance: number;
      totalClaimed: number;
      totalEarned: number;
      lastClaimedAt?: Timestamp;
    };
  };
}

interface IncomeTransaction {
  id: string;
  userId: string;
  rank: string;
  amount: number;
  type: 'pool_income' | 'claim';
  status: 'locked' | 'available' | 'claimed';
  createdAt: Timestamp;
  claimedAt?: Timestamp;
}

const PLATFORM_RANKS = [
  'Azurite', 'Benitoite', 'Crystals', 'Diamond', 'Emerald', 
  'Feldspar', 'Garnet', 'Hackmanite', 'Iolite', 'Jeremejevite'
];

const GlobalIncomeManagement: React.FC = () => {
  const {} = useAuth();
  const [users, setUsers] = useState<GlobalIncomeUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<GlobalIncomeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<GlobalIncomeUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    rank: '',
    level: 0,
    lockedBalance: 0,
    availableBalance: 0,
    totalClaimed: 0,
    totalEarned: 0,
    directReferrals: 0,
    status: 'active' as 'active' | 'inactive' | 'suspended',
    suspensionReason: ''
  });
  const [processing, setProcessing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(12);

  useEffect(() => {
    fetchGlobalIncomeData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, rankFilter, statusFilter]);

  const fetchGlobalIncomeData = async () => {
    try {
      setLoading(true);
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: GlobalIncomeUser[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        const incomeTransactionsSnapshot = await getDocs(
          collection(db, 'users', userDoc.id, 'incomeTransactions')
        );

        const globalIncomeData: GlobalIncomeUser['globalIncomeData'] = {};

        for (const rank of PLATFORM_RANKS) {
          const rankTransactions = incomeTransactionsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as IncomeTransaction))
            .filter(transaction => transaction.rank === rank);

          const lockedBalance = rankTransactions
            .filter(t => t.status === 'locked')
            .reduce((sum, t) => sum + t.amount, 0);

          const availableBalance = rankTransactions
            .filter(t => t.status === 'available')
            .reduce((sum, t) => sum + t.amount, 0);

          const totalClaimed = rankTransactions
            .filter(t => t.status === 'claimed')
            .reduce((sum, t) => sum + t.amount, 0);

          const totalEarned = lockedBalance + availableBalance + totalClaimed;

          const lastClaimedTransaction = rankTransactions
            .filter(t => t.status === 'claimed' && t.claimedAt)
            .sort((a, b) => (b.claimedAt?.seconds || 0) - (a.claimedAt?.seconds || 0))[0];

          globalIncomeData[rank] = {
            lockedBalance,
            availableBalance,
            totalClaimed,
            lastClaimedAt: lastClaimedTransaction?.claimedAt,
            totalEarned
          };
        }

        usersData.push({
          userCode: userData.userCode || userDoc.id,
          displayName: userData.displayName || 'Unknown User',
          email: userData.email || '',
          phone: userData.phone || '',
          rank: userData.rank || 'Azurite',
          level: userData.level || 1,
          status: userData.status || 'inactive',
          directReferrals: userData.directReferrals || 0,
          lastLogin: userData.lastLogin,
          suspensionReason: userData.suspensionReason || '',
          globalIncomeData
        });
      }

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching global income data:', error);
      toast.error('Failed to fetch global income data');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.userCode?.toLowerCase().includes(term)
      );
    }

    if (rankFilter !== 'all') {
      filtered = filtered.filter(user => user.rank === rankFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'eligible') {
        filtered = filtered.filter(user => user.directReferrals >= 2);
      } else if (statusFilter === 'not_eligible') {
        filtered = filtered.filter(user => user.directReferrals < 2);
      } else {
        filtered = filtered.filter(user => user.status === statusFilter);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleUserClick = (user: GlobalIncomeUser) => {
    setSelectedUser(user);
    const currentRankData = user.globalIncomeData[user.rank] || {
      lockedBalance: 0,
      availableBalance: 0,
      totalClaimed: 0,
      totalEarned: 0
    };
    
    setEditForm({
      rank: user.rank,
      level: user.level || 1,
      lockedBalance: currentRankData.lockedBalance,
      availableBalance: currentRankData.availableBalance,
      totalClaimed: currentRankData.totalClaimed,
      totalEarned: currentRankData.totalEarned,
      directReferrals: user.directReferrals,
      status: user.status,
      suspensionReason: user.suspensionReason || ''
    });
    setIsEditing(false);
    setShowUserModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let userDocId = '';
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.userCode === selectedUser.userCode) {
          userDocId = userDoc.id;
          break;
        }
      }
      
      if (!userDocId) {
        toast.error('User document not found');
        return;
      }
      
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        rank: editForm.rank,
        level: editForm.level,
        [`globalIncomeData.${editForm.rank}.lockedBalance`]: editForm.lockedBalance,
        [`globalIncomeData.${editForm.rank}.availableBalance`]: editForm.availableBalance,
        [`globalIncomeData.${editForm.rank}.totalClaimed`]: editForm.totalClaimed,
        [`globalIncomeData.${editForm.rank}.totalEarned`]: editForm.totalEarned,
        directReferrals: editForm.directReferrals,
        status: editForm.status,
        suspensionReason: editForm.suspensionReason,
        updatedAt: Timestamp.now()
      });

      toast.success('User data updated successfully');
      setIsEditing(false);
      await fetchGlobalIncomeData();
    } catch (error) {
      console.error('Error updating user data:', error);
      toast.error('Failed to update user data');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      'Azurite': 'bg-blue-100 text-blue-800 border-blue-200',
      'Benitoite': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Crystals': 'bg-purple-100 text-purple-800 border-purple-200',
      'Diamond': 'bg-gray-100 text-gray-800 border-gray-200',
      'Emerald': 'bg-green-100 text-green-800 border-green-200',
      'Feldspar': 'bg-pink-100 text-pink-800 border-pink-200',
      'Garnet': 'bg-red-100 text-red-800 border-red-200',
      'Hackmanite': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Iolite': 'bg-violet-100 text-violet-800 border-violet-200',
      'Jeremejevite': 'bg-amber-100 text-amber-800 border-amber-200'
    };
    return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'inactive': 'bg-gray-100 text-gray-800 border-gray-200',
      'suspended': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-yellow-800 text-lg font-medium">Loading Global Income Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-yellow-900 mb-2">
            Global Income Management
          </h1>
          <p className="text-yellow-700 text-lg">
            Manage user income, ranks, and earnings across all platform levels
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Locked</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.lockedBalance, 0), 0))}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Available</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.availableBalance, 0), 0))}
                </p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Claimed</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.totalClaimed, 0), 0))}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/70 backdrop-blur-sm border border-yellow-200 rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-600" />
              <input
                type="text"
                placeholder="Search by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/80 border border-yellow-200 rounded-xl text-yellow-900 placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-600" />
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/80 border border-yellow-200 rounded-xl text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none transition-all"
              >
                <option value="all">All Ranks</option>
                {PLATFORM_RANKS.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <CheckCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/80 border border-yellow-200 rounded-xl text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="eligible">Eligible (2+ Referrals)</option>
                <option value="not_eligible">Not Eligible</option>
              </select>
            </div>

            <div className="flex items-center justify-center">
              <span className="bg-yellow-100/80 text-yellow-800 px-4 py-3 rounded-xl border border-yellow-300 font-semibold">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {currentUsers.map((user) => {
            const currentRankData = user.globalIncomeData[user.rank] || {
              lockedBalance: 0,
              availableBalance: 0,
              totalClaimed: 0,
              totalEarned: 0
            };

            return (
              <div 
                key={user.userCode} 
                onClick={() => handleUserClick(user)}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
              >
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate text-sm sm:text-base">
                        {user.displayName}
                      </h3>
                      <p className="text-yellow-100 text-xs font-mono truncate">
                        {user.userCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRankColor(user.rank)}`}>
                      {user.rank}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-yellow-600 font-medium">Referrals</p>
                      <p className="text-yellow-900 font-bold">{user.directReferrals}</p>
                    </div>
                    <div>
                      <p className="text-yellow-600 font-medium">Level</p>
                      <p className="text-yellow-900 font-bold">{user.level || 1}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Available:</span>
                      <span className="text-green-700 font-semibold">
                        {formatCurrency(currentRankData.availableBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Locked:</span>
                      <span className="text-orange-700 font-semibold">
                        {formatCurrency(currentRankData.lockedBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Total Earned:</span>
                      <span className="text-yellow-900 font-bold">
                        {formatCurrency(currentRankData.totalEarned)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-yellow-200">
                    <div className="flex items-center justify-between text-xs text-yellow-600">
                      <span>Click to view details</span>
                      <EyeIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-200 transition-colors"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      currentPage === pageNum
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
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
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-200 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedUser.displayName}</h2>
                    <p className="text-yellow-100 font-mono">{selectedUser.userCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-yellow-900 border-b border-yellow-200 pb-2">
                    User Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Email</label>
                      <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg">{selectedUser.email}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Phone</label>
                      <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg">{selectedUser.phone || 'Not provided'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Rank</label>
                      {isEditing ? (
                        <select
                          value={editForm.rank}
                          onChange={(e) => setEditForm(prev => ({ ...prev, rank: e.target.value }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        >
                          {PLATFORM_RANKS.map(rank => (
                            <option key={rank} value={rank}>{rank}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRankColor(selectedUser.rank)}`}>
                          {selectedUser.rank}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Level</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.level}
                          onChange={(e) => setEditForm(prev => ({ ...prev, level: parseInt(e.target.value) || 0 }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="1"
                        />
                      ) : (
                        <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg">{selectedUser.level || 1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Status</label>
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'suspended' }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedUser.status)}`}>
                          {selectedUser.status}
                        </span>
                      )}
                    </div>

                    {(isEditing && editForm.status === 'suspended') || (!isEditing && selectedUser.status === 'suspended') ? (
                      <div>
                        <label className="block text-sm font-medium text-yellow-700 mb-1">Suspension Reason</label>
                        {isEditing ? (
                          <textarea
                            value={editForm.suspensionReason}
                            onChange={(e) => setEditForm(prev => ({ ...prev, suspensionReason: e.target.value }))}
                            className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            rows={3}
                          />
                        ) : (
                          <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg">{selectedUser.suspensionReason || 'No reason provided'}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-yellow-900 border-b border-yellow-200 pb-2">
                    Income & Referrals
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Direct Referrals</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.directReferrals}
                          onChange={(e) => setEditForm(prev => ({ ...prev, directReferrals: parseInt(e.target.value) || 0 }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg font-semibold">{selectedUser.directReferrals}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Locked Balance</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.lockedBalance}
                          onChange={(e) => setEditForm(prev => ({ ...prev, lockedBalance: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-orange-700 bg-orange-50 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.lockedBalance)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Available Balance</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.availableBalance}
                          onChange={(e) => setEditForm(prev => ({ ...prev, availableBalance: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-green-700 bg-green-50 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.availableBalance)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Total Claimed</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.totalClaimed}
                          onChange={(e) => setEditForm(prev => ({ ...prev, totalClaimed: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-blue-700 bg-blue-50 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.totalClaimed)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Total Earned</label>
                      <p className="text-yellow-900 bg-yellow-100 p-2 rounded-lg font-bold text-lg">
                        {formatCurrency(editForm.lockedBalance + editForm.availableBalance + editForm.totalClaimed)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">Last Login</label>
                      <p className="text-yellow-900 bg-yellow-50 p-2 rounded-lg">
                        {selectedUser.lastLogin 
                          ? new Date(selectedUser.lastLogin.seconds * 1000).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-yellow-200">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={processing}
                      className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalIncomeManagement;