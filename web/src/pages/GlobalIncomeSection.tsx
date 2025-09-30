import React, { useState, useEffect } from 'react';
import { 
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
  BoltIcon,
  GiftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  onSnapshot, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { claimIncome } from '../services/firestoreService';
import Modal from '../components/ui/Modal';
import { useModal } from '../hooks/useModal';

// Interfaces
interface RankData {
  name: string;
  activationAmount: number;
  color: string;
  gradient: string;
  icon: string;
  order: number;
  maxPoolIncome: number;
  isUnlocked: boolean;
  currentIncome: number;
  lockedIncome: number;
  availableIncome: number;
  progress: number;
  backendKey: string; // Add backend key mapping
}

interface UserPoolData {
  uid: string;
  availableBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  poolIncomeEarned: number;
  directReferrals: number;
  claimEligible: boolean;
  rankBalances: { [rank: string]: number };
  claimableIncome: number;
  currentRank: string;
  unlockedRanks: string[];
  joinedAt?: any;
}

interface PoolTransaction {
  id: string;
  type: 'pool_income' | 'claim' | 'unlock';
  amount: number;
  rank: string;
  status: 'locked' | 'available' | 'claimed';
  createdAt: any;
  serial?: number;
  joinOrder?: number;
}

const GlobalIncomeSection: React.FC = () => {
  const { user } = useAuth();
  const [userPoolData, setUserPoolData] = useState<UserPoolData | null>(null);
  const [poolTransactions, setPoolTransactions] = useState<PoolTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingRank, setClaimingRank] = useState<string | null>(null);
  const [unlockingRank, setUnlockingRank] = useState<string | null>(null);
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [claimPopupData, setClaimPopupData] = useState<any>(null);
  
  // Add modal hook
  const { modalState, showError, showSuccess, hideModal } = useModal();

  // Gemstone ranks configuration with corrected activation amounts per user plan
  const RANKS: RankData[] = [
    {
      name: 'Azurite',
      backendKey: 'azurite',
      activationAmount: 5, // ✓ Correct per plan
      color: '#3B82F6',
      gradient: 'from-blue-500 to-blue-700',
      icon: '💎',
      order: 1,
      maxPoolIncome: 511.50,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Benitoite',
      backendKey: 'pearl',
      activationAmount: 10, // ✓ Fixed per plan (was $25)
      color: '#10B981',
      gradient: 'from-emerald-500 to-emerald-700',
      icon: '🟢',
      order: 2,
      maxPoolIncome: 1023.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Citrine',
      backendKey: 'ruby',
      activationAmount: 20, // ✓ Fixed per plan (was $125)
      color: '#F59E0B',
      gradient: 'from-amber-500 to-amber-700',
      icon: '🟡',
      order: 3,
      maxPoolIncome: 2557.50,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Danburite',
      backendKey: 'emerald',
      activationAmount: 40, // ✓ Fixed per plan (was $625)
      color: '#EF4444',
      gradient: 'from-red-500 to-red-700',
      icon: '🔴',
      order: 4,
      maxPoolIncome: 5115.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Emerald',
      backendKey: 'sapphire',
      activationAmount: 80, // ✓ Fixed per plan (was $3125)
      color: '#10B981',
      gradient: 'from-green-500 to-green-700',
      icon: '💚',
      order: 5,
      maxPoolIncome: 12787.50,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Fluorite',
      backendKey: 'diamond',
      activationAmount: 160, // ✓ Fixed per plan (was $15625)
      color: '#8B5CF6',
      gradient: 'from-purple-500 to-purple-700',
      icon: '🟣',
      order: 6,
      maxPoolIncome: 25575.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Garnet',
      backendKey: 'doubleDiamond',
      activationAmount: 320, // ✓ Fixed per plan (was $78125)
      color: '#DC2626',
      gradient: 'from-red-600 to-red-800',
      icon: '🔺',
      order: 7,
      maxPoolIncome: 51150.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Hematite',
      backendKey: 'tripleDiamond',
      activationAmount: 640, // ✓ Fixed per plan (was $390625)
      color: '#374151',
      gradient: 'from-gray-600 to-gray-800',
      icon: '⚫',
      order: 8,
      maxPoolIncome: 102300.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Iolite',
      backendKey: 'crown',
      activationAmount: 1280, // ✓ Fixed per plan (was $1953125)
      color: '#4F46E5',
      gradient: 'from-indigo-600 to-indigo-800',
      icon: '🔵',
      order: 9,
      maxPoolIncome: 204600.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    },
    {
      name: 'Jeremejevite',
      backendKey: 'royalCrown',
      activationAmount: 2560, // ✓ Fixed per plan (was $9765625)
      color: '#EC4899',
      gradient: 'from-pink-600 to-pink-800',
      icon: '💖',
      order: 10,
      maxPoolIncome: 511500.00,
      isUnlocked: false,
      currentIncome: 0,
      lockedIncome: 0,
      availableIncome: 0,
      progress: 0
    }
  ];

  useEffect(() => {
    if (!user?.uid) return;

    // Real-time user data listener
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Extract unlocked ranks from rankActivations field (backend format)
        const rankActivations = data.rankActivations || {};
        const unlockedRanks = ['Azurite']; // Default first rank
        
        // Add ranks that are activated in the backend
        Object.keys(rankActivations).forEach(rankKey => {
          if (rankActivations[rankKey]?.isActive) {
            // Map backend keys to display names
            const rankMapping: { [key: string]: string } = {
              'azurite': 'Azurite',
              'pearl': 'Benitoite',
              'ruby': 'Citrine',
              'emerald': 'Danburite',
              'sapphire': 'Emerald',
              'diamond': 'Fluorite',
              'doubleDiamond': 'Garnet',
              'tripleDiamond': 'Hematite',
              'crown': 'Iolite',
              'royalCrown': 'Jeremejevite'
            };
            
            const displayName = rankMapping[rankKey] || rankKey;
            if (!unlockedRanks.includes(displayName)) {
              unlockedRanks.push(displayName);
            }
          }
        });

        const newUserData = {
          uid: user.uid,
          // Fix: Use only availableBalance to match backend validation
          availableBalance: data.availableBalance || 0,
          lockedBalance: data.lockedBalance || 0,
          totalEarnings: data.totalEarnings || 0,
          poolIncomeEarned: data.poolIncomeEarned || 0,
          directReferrals: data.directReferrals || 0,
          claimEligible: data.claimEligible || false,
          rankBalances: data.rankBalances || {},
          claimableIncome: data.claimableIncome || 0,
          currentRank: data.rank || 'Azurite',
          unlockedRanks: unlockedRanks,
          joinedAt: data.createdAt
        };
        
        // Check if user just became eligible for claims (2 direct referrals)
        if (userPoolData && userPoolData.directReferrals < 2 && newUserData.directReferrals >= 2) {
          setClaimPopupData({
            totalClaimable: newUserData.claimableIncome,
            availableRanks: newUserData.unlockedRanks.length,
            message: "Congratulations! You now have 2 direct referrals and can claim your pool income!"
          });
          setShowClaimPopup(true);
        }
        
        setUserPoolData(newUserData);
      }
      setLoading(false);
    });

    // Real-time pool transactions listener with serial ordering
    const transactionsQuery = query(
      collection(db, 'incomeTransactions'),
      where('uid', '==', user.uid),
      where('type', 'in', ['pool', 'referral', 'claim']),
      orderBy('createdAt', 'asc'), // Changed to ascending for serial order
      limit(50)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions: PoolTransaction[] = [];
      let index = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: data.type === 'pool' ? 'pool_income' : data.type,
          amount: data.amount || 0,
          rank: data.rank || 'Azurite',
          status: data.status || 'locked',
          createdAt: data.createdAt,
          serial: index + 1, // Serial based on join order
          joinOrder: index + 1
        });
        index++;
      });
      setPoolTransactions(transactions);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
    };
  }, [user?.uid, userPoolData?.directReferrals]);

  const handleClaimIncome = async (rank: string) => {
    if (!user?.uid || !userPoolData?.claimEligible) return;
    
    setClaimingRank(rank);
    try {
      await claimIncome(user.uid);
      // Success feedback will be handled by real-time updates
    } catch (error) {
      console.error('Error claiming income:', error);
      alert('Failed to claim income. Please try again.');
    } finally {
      setClaimingRank(null);
    }
  };

  const handleUnlockRank = async (rank: string) => {
    if (!user?.uid || !userPoolData) return;
    
    // Find the rank configuration to get the backend key
    const rankConfig = RANKS.find(r => r.name === rank);
    if (!rankConfig) {
      showError('Invalid Rank', 'Invalid rank specified');
      return;
    }

    // Validate balance before making the request
    if (userPoolData.availableBalance < rankConfig.activationAmount) {
      // Show professional error popup using the new modal system
      showError(
        'Insufficient Balance',
        `You do not have enough balance to unlock this rank.\n\nRequired: $${rankConfig.activationAmount.toFixed(2)}\nAvailable: $${userPoolData.availableBalance.toFixed(2)}`
      );
      return;
    }
    
    setUnlockingRank(rank);
    try {
      // Call Firebase function for single rank activation using backend key
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../config/firebase');
      
      const activateRankFunction = httpsCallable(functions, 'activateRank');
      
      const result = await activateRankFunction({
        rank: rankConfig.backendKey, // Use backend key instead of display name
        activateAllRanks: false,
        paymentMethod: 'wallet'
      });

      const responseData = result.data as { success: boolean; message?: string };
      if (responseData.success) {
        showSuccess('Rank Unlocked', `Successfully unlocked ${rank} rank!`);
      } else {
        throw new Error(responseData.message || 'Failed to unlock rank');
      }
    } catch (error: any) {
      console.error('Error unlocking rank:', error);
      
      // Handle structured error responses from backend
      if (error.code === 'functions/failed-precondition' && error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error === 'insufficient_balance') {
            showError(
              'Insufficient Balance',
              `${errorData.message}\n\nRequired: $${errorData.details.required.toFixed(2)}\nAvailable: $${errorData.details.available.toFixed(2)}\nShortfall: $${errorData.details.shortfall.toFixed(2)}`
            );
            return;
          }
        } catch {
          // Fall through to generic error handling
        }
      }
      
      // Show professional error popup using the new modal system
      showError(
        'Unlock Failed',
        'Unable to unlock the rank. Please try again later.'
      );
    } finally {
      setUnlockingRank(null);
    }
  };

  const handleUnlockAllRanks = async () => {
    if (!user?.uid || !userPoolData) return;
    
    setUnlockingRank('all');
    try {
      // Find all locked ranks that can be unlocked
      const lockedRanks = RANKS.filter(rank => !userPoolData.unlockedRanks.includes(rank.name));
      
      if (lockedRanks.length === 0) {
        alert('All ranks are already unlocked!');
        return;
      }

      // Calculate total cost
      const totalCost = lockedRanks.reduce((sum, rank) => sum + rank.activationAmount, 0);
      
      // Validate balance before making the request
      if (userPoolData.availableBalance < totalCost) {
        // Show professional error popup instead of raw Firebase error
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Insufficient Balance</h3>
            </div>
            <p class="text-gray-600 mb-6">You do not have enough balance to unlock all ranks.</p>
            <div class="text-sm text-gray-500 mb-4">
              <p>Required: $${totalCost.toFixed(2)}</p>
              <p>Available: $${userPoolData.availableBalance.toFixed(2)}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              OK
            </button>
          </div>
        `;
        document.body.appendChild(modal);
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `Unlock ${lockedRanks.length} ranks for $${totalCost.toFixed(2)}?\n\nRanks: ${lockedRanks.map(r => r.name).join(', ')}`
      );
      
      if (!confirmed) return;

      // Call Firebase function for multi-rank activation using backend key
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../config/firebase');
      
      const activateRankFunction = httpsCallable(functions, 'activateRank');
      
      const result = await activateRankFunction({
        rank: lockedRanks[0].backendKey, // Use backend key for first locked rank
        activateAllRanks: true,
        paymentMethod: 'wallet'
      });

      const responseData = result.data as { success: boolean; message?: string; activatedRanks?: any[] };
      if (responseData.success) {
        alert(`Successfully unlocked ${responseData.activatedRanks?.length || 0} ranks!`);
      } else {
        throw new Error(responseData.message || 'Failed to unlock ranks');
      }
    } catch (error: any) {
      console.error('Error unlocking all ranks:', error);
      
      // Handle structured error responses from backend
      if (error.code === 'functions/failed-precondition' && error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error === 'insufficient_balance') {
            showError(
              'Insufficient Balance',
              `${errorData.message}\n\nRequired: $${errorData.details.required.toFixed(2)}\nAvailable: $${errorData.details.available.toFixed(2)}\nShortfall: $${errorData.details.shortfall.toFixed(2)}`
            );
            return;
          }
        } catch {
          // Fall through to generic error handling
        }
      }
      
      // Show professional error popup for any other errors
      showError(
        'Unlock Failed',
        'Unable to unlock the ranks. Please try again later.'
      );
    } finally {
      setUnlockingRank(null);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getRankData = (): RankData[] => {
    if (!userPoolData) return RANKS;

    return RANKS.map(rank => {
      const rankBalance = userPoolData.rankBalances[rank.name.toLowerCase()] || 0;
      const isUnlocked = userPoolData.unlockedRanks.includes(rank.name);
      const progress = Math.min((rankBalance / rank.maxPoolIncome) * 100, 100);

      return {
        ...rank,
        isUnlocked,
        currentIncome: rankBalance,
        lockedIncome: isUnlocked ? 0 : rankBalance,
        availableIncome: isUnlocked && userPoolData.claimEligible ? rankBalance : 0,
        progress
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-black flex items-center justify-center">
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span>Loading Auto Pool Income...</span>
        </div>
      </div>
    );
  }

  const rankData = getRankData();
  const totalLockedIncome = rankData.reduce((sum, rank) => sum + rank.lockedIncome, 0);
  const totalClaimableIncome = userPoolData?.claimableIncome || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <SparklesIcon className="w-12 h-12 text-blue-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Auto Pool Income Flow
            </h1>
            <SparklesIcon className="w-12 h-12 text-pink-400" />
          </div>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Experience the power of automated serial-wise pool income generation across 10 gemstone ranks
          </p>
        </div>

        {/* Balance Overview Bar - Fixed Available Income Display */}
        <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-green-400 mr-3" />
                <span className="text-lg font-medium text-gray-300">Available Income</span>
              </div>
              <div className="text-3xl font-bold text-green-400">
                {formatCurrency(userPoolData?.availableBalance || 0)}
              </div>
              <p className="text-sm text-gray-400 mt-2">Total Wallet Balance</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <LockClosedIcon className="w-8 h-8 text-orange-400 mr-3" />
                <span className="text-lg font-medium text-gray-300">Locked Income</span>
              </div>
              <div className="text-3xl font-bold text-orange-400">
                {formatCurrency(totalLockedIncome)}
              </div>
              <p className="text-sm text-gray-400 mt-2">Pending Claims</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <GiftIcon className="w-8 h-8 text-blue-400 mr-3" />
                <span className="text-lg font-medium text-gray-300">
                  {userPoolData?.claimEligible ? 'Ready to Claim' : 'Claimable Soon'}
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {formatCurrency(totalClaimableIncome)}
              </div>
              <p className="text-sm text-gray-400 mt-2">Pool Earnings</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <UserGroupIcon className="w-8 h-8 text-purple-400 mr-3" />
                <span className="text-lg font-medium text-gray-300">Direct Referrals</span>
              </div>
              <div className="text-3xl font-bold text-purple-400">
                {userPoolData?.directReferrals || 0} / 2
              </div>
              <p className="text-sm text-gray-400 mt-2">Claim Eligibility</p>
            </div>
          </div>

          {/* Claim Eligibility Status */}
          <div className="mt-8 text-center">
            {userPoolData?.claimEligible ? (
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="text-lg font-semibold">Eligible to claim income!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-orange-400">
                <ClockIcon className="w-6 h-6" />
                <span className="text-lg font-semibold">
                  Need {2 - (userPoolData?.directReferrals || 0)} more direct referrals to unlock claims
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Auto Pool Rank Section - Reverted to Earlier Design */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Auto Pool Rank
          </h2>
          
          {/* Rank-wise Pool Accumulation Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankData.map((rank) => (
              <div
                key={rank.name}
                className={`
                  relative overflow-hidden
                  bg-gradient-to-br ${rank.gradient} bg-opacity-10 
                  backdrop-blur-sm border-2 
                  ${rank.isUnlocked ? 'border-green-400/50 shadow-lg shadow-green-400/20' : 'border-gray-600/50'}
                  rounded-2xl p-6 transition-all duration-300 
                  hover:scale-105 hover:shadow-2xl
                  ${rank.isUnlocked ? 'hover:shadow-green-400/30' : 'hover:shadow-blue-400/30'}
                `}
              >
                {/* Unlock Status Indicator */}
                <div className="absolute top-4 right-4">
                  {rank.isUnlocked ? (
                    <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center shadow-lg shadow-blue-400/50 ring-2 ring-blue-400/30">
                      <CheckCircleIcon 
                        className="w-8 h-8 drop-shadow-lg" 
                        style={{ 
                          color: '#1E90FF',
                          filter: 'drop-shadow(0 0 8px rgba(30, 144, 255, 0.6)) drop-shadow(0 0 16px rgba(30, 144, 255, 0.4))'
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center">
                      <LockClosedIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Rank Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="text-5xl filter drop-shadow-lg">{rank.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{rank.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <span>Rank #{rank.order}</span>
                      <span>•</span>
                      <span>{formatCurrency(rank.activationAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Pool Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-300">Pool Progress</span>
                    <span className="text-sm font-bold text-white">{rank.progress.toFixed(1)}%</span>
                  </div>
                  
                  <div className="relative w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`
                        absolute top-0 left-0 h-full 
                        bg-gradient-to-r ${rank.gradient} 
                        rounded-full transition-all duration-1000 ease-out
                      `}
                      style={{ width: `${rank.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{formatCurrency(rank.currentIncome)}</span>
                    <span>{formatCurrency(rank.maxPoolIncome)}</span>
                  </div>
                </div>

                {/* Income Display */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="text-orange-400 text-xs font-semibold mb-1">LOCKED</div>
                    <div className="text-white font-bold text-lg">{formatCurrency(rank.lockedIncome)}</div>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-green-400 text-xs font-semibold mb-1">AVAILABLE</div>
                    <div className="text-white font-bold text-lg">{formatCurrency(rank.availableIncome)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!rank.isUnlocked && (
                    <button
                      onClick={() => handleUnlockRank(rank.name)}
                      disabled={unlockingRank === rank.name}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
                    >
                      {unlockingRank === rank.name ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <LockOpenIcon className="w-5 h-5" />
                      )}
                      <span>Unlock Rank</span>
                    </button>
                  )}

                  {rank.isUnlocked && (
                    <div className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg">
                      <CheckCircleIcon 
                        className="w-6 h-6" 
                        style={{ 
                          color: '#1E90FF',
                          filter: 'drop-shadow(0 0 6px rgba(30, 144, 255, 0.5))'
                        }} 
                      />
                      <span style={{ color: 'white' }}>Running</span>
                    </div>
                  )}

                  {rank.isUnlocked && rank.availableIncome > 0 && userPoolData?.claimEligible && (
                    <button
                      onClick={() => handleClaimIncome(rank.name)}
                      disabled={claimingRank === rank.name}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/25 animate-pulse"
                    >
                      {claimingRank === rank.name ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <CurrencyDollarIcon className="w-5 h-5" />
                      )}
                      <span>Claim Now</span>
                    </button>
                  )}

                  {rank.isUnlocked && rank.availableIncome === 0 && !userPoolData?.claimEligible && (
                    <div className="w-full bg-gray-600/20 text-gray-400 px-6 py-3 rounded-xl font-semibold text-center border border-gray-600/30">
                      No Income Available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Serial-wise Pool Payouts */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <ChartBarIcon className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Serial-wise Auto Pool Payouts</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Serial #</th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Type</th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Rank</th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Amount</th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {poolTransactions.length > 0 ? (
                  poolTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-4 text-white font-mono">#{transaction.serial || index + 1}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          transaction.type === 'pool_income' ? 'bg-blue-500/20 text-blue-300' :
                          transaction.type === 'claim' ? 'bg-green-500/20 text-green-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {transaction.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white capitalize">{transaction.rank}</td>
                      <td className="py-4 px-4 text-white font-semibold">{formatCurrency(transaction.amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          transaction.status === 'locked' ? 'bg-orange-500/20 text-orange-300' :
                          transaction.status === 'available' ? 'bg-green-500/20 text-green-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {transaction.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {transaction.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-gray-400">
                      No pool transactions yet. Start by unlocking ranks to begin earning!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-rank Unlock Section */}
        <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BoltIcon className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Multi-Rank Unlock</h2>
            </div>
            <button
              onClick={handleUnlockAllRanks}
              disabled={unlockingRank === 'all'}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {unlockingRank === 'all' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <BoltIcon className="w-5 h-5" />
                  <span>Unlock All Ranks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Claim Available Popup */}
      {showClaimPopup && claimPopupData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-900 to-blue-900 border border-green-400/30 rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowClaimPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <GiftIcon className="w-8 h-8 text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">Claim Available!</h3>
              
              <p className="text-gray-300 mb-6">
                {claimPopupData.message}
              </p>
              
              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Total Claimable:</span>
                  <span className="text-green-400 font-bold text-xl">
                    {formatCurrency(claimPopupData.totalClaimable)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Available Ranks:</span>
                  <span className="text-blue-400 font-semibold">
                    {claimPopupData.availableRanks}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowClaimPopup(false);
                  // Scroll to rank cards
                  document.querySelector('.grid')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Claiming
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Component for Professional Error/Success Messages */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        type={modalState.type}
      >
        {modalState.message}
      </Modal>
    </div>
  );
};

export default GlobalIncomeSection;