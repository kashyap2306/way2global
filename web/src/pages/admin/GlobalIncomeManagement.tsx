import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckCircleIcon, 
  BanknotesIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  XMarkIcon,
  EyeIcon
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg font-medium">Loading Global Income Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
          Global Income Management
        </h1>
        <p className="text-gray-300 text-sm sm:text-base">
          Manage user income, ranks, and earnings across all platform levels
        </p>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-xs sm:text-sm font-medium">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{users.length}</p>
              </div>
              <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-xs sm:text-sm font-medium">Total Locked</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.lockedBalance, 0), 0))}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-xs sm:text-sm font-medium">Total Available</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.availableBalance, 0), 0))}
                </p>
              </div>
              <BanknotesIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-xs sm:text-sm font-medium">Total Claimed</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {formatCurrency(users.reduce((sum, user) => 
                    sum + Object.values(user.globalIncomeData).reduce((rankSum, data) => 
                      rankSum + data.totalClaimed, 0), 0))}
                </p>
              </div>
              <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all text-sm sm:text-base"
              >
                <option value="all">All Ranks</option>
                {PLATFORM_RANKS.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <CheckCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all text-sm sm:text-base"
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
              <span className="bg-white/10 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-white/20 font-semibold text-sm sm:text-base">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
                className="bg-black/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group overflow-hidden"
              >
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 sm:p-4">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-base sm:text-lg font-bold">
                        {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate text-sm sm:text-base">
                        {user.displayName}
                      </h3>
                      <p className="text-purple-100 text-xs font-mono truncate">
                        {user.userCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-1 sm:gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRankColor(user.rank)}`}>
                      {user.rank}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 font-medium text-xs sm:text-sm">Referrals</p>
                      <p className="text-white font-bold text-sm sm:text-base">{user.directReferrals}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium text-xs sm:text-sm">Level</p>
                      <p className="text-white font-bold text-sm sm:text-base">{user.level || 1}</p>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available:</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(currentRankData.availableBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Locked:</span>
                      <span className="text-orange-400 font-semibold">
                        {formatCurrency(currentRankData.lockedBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Earned:</span>
                      <span className="text-white font-bold">
                        {formatCurrency(currentRankData.totalEarned)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-gray-400">
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
          <div className="flex justify-center items-center space-x-1 sm:space-x-2 mt-6 sm:mt-8 px-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 sm:px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors text-sm sm:text-base"
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
                    className={`px-2 sm:px-3 py-2 rounded-lg border transition-colors text-sm sm:text-base ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
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
              className="px-3 sm:px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors text-sm sm:text-base"
            >
              Next
            </button>
          </div>
        )}

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gray-900 rounded-lg sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-white/10">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 rounded-t-lg sm:rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg sm:text-2xl font-bold">
                      {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{selectedUser.displayName}</h2>
                    <p className="text-purple-100 font-mono text-sm sm:text-base truncate">{selectedUser.userCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white border-b border-white/20 pb-2">
                    User Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white bg-white/10 p-2 sm:p-3 rounded-lg text-sm sm:text-base break-all">{selectedUser.email}</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Phone</label>
                      <p className="text-white bg-white/10 p-2 rounded-lg">{selectedUser.phone || 'Not provided'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Rank</label>
                      {isEditing ? (
                        <select
                          value={editForm.rank}
                          onChange={(e) => setEditForm(prev => ({ ...prev, rank: e.target.value }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Level</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.level}
                          onChange={(e) => setEditForm(prev => ({ ...prev, level: parseInt(e.target.value) || 0 }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="1"
                        />
                      ) : (
                        <p className="text-white bg-white/10 p-2 rounded-lg">{selectedUser.level || 1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Status</label>
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'suspended' }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        <label className="block text-xs font-medium text-gray-400 mb-1">Suspension Reason</label>
                        {isEditing ? (
                          <textarea
                            value={editForm.suspensionReason}
                            onChange={(e) => setEditForm(prev => ({ ...prev, suspensionReason: e.target.value }))}
                            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={3}
                          />
                        ) : (
                          <p className="text-white bg-white/10 p-2 rounded-lg">{selectedUser.suspensionReason || 'No reason provided'}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
                    Income & Referrals
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Direct Referrals</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.directReferrals}
                          onChange={(e) => setEditForm(prev => ({ ...prev, directReferrals: parseInt(e.target.value) || 0 }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-white bg-white/10 p-2 rounded-lg font-semibold">{selectedUser.directReferrals}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Locked Balance</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.lockedBalance}
                          onChange={(e) => setEditForm(prev => ({ ...prev, lockedBalance: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-orange-400 bg-orange-900/20 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.lockedBalance)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Available Balance</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.availableBalance}
                          onChange={(e) => setEditForm(prev => ({ ...prev, availableBalance: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-green-400 bg-green-900/20 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.availableBalance)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Total Claimed</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.totalClaimed}
                          onChange={(e) => setEditForm(prev => ({ ...prev, totalClaimed: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                        />
                      ) : (
                        <p className="text-blue-400 bg-blue-900/20 p-2 rounded-lg font-semibold">
                          {formatCurrency(editForm.totalClaimed)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Total Earned</label>
                      <p className="text-white bg-purple-900/20 p-2 rounded-lg font-bold text-lg">
                        {formatCurrency(editForm.lockedBalance + editForm.availableBalance + editForm.totalClaimed)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Last Login</label>
                      <p className="text-white bg-white/10 p-2 rounded-lg">
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
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-white/20">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={processing}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
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