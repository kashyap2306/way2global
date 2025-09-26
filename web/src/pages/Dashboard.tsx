import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import REIDManagement from '../components/reid/REIDManagement';
import DashboardCards from '../components/dashboard/DashboardCards';

// Enhanced interfaces matching Firestore schema
interface MLMUserData {
  uid: string;
  email: string;
  displayName?: string;
  rank?: string;
  status: 'active' | 'inactive' | 'suspended';
  balance: number;
  totalEarnings: number;
  referrals: string[];
  referredBy?: string;
  activationAmount: number;
  cyclesCompleted: number;
  walletAddress?: string;
  contact?: string;
  role?: 'user' | 'admin';
  createdAt: Timestamp | Date;
  lastLoginAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'topup' | 'withdrawal' | 'transfer' | 'income' | 'fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  fromUser?: string;
  toUser?: string;
  walletAddress?: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface Income {
  id: string;
  userId: string;
  type: 'referral' | 'topup' | 'global' | 'level' | 'retopup' | 'bonus';
  amount: number;
  fromUser?: string;
  level?: number;
  description?: string;
  createdAt: Timestamp | Date;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  finalAmount: number;
  deductionPercentage: number;
  walletAddress: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  requestedAt: Timestamp | Date;
  processedAt?: Timestamp | Date;
  adminNotes?: string;
}

interface ReferralUser {
  uid: string;
  email: string;
  displayName?: string;
  rank?: string;
  status: string;
  joinDate: Timestamp | Date;
  totalEarnings: number;
}

const Dashboard: React.FC = () => {
  const { currentUser, userData: authUserData, logout, updateUserData } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [userData, setUserData] = useState<MLMUserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modal states
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Form states
  const [topupAmount, setTopupAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [profileData, setProfileData] = useState({
    displayName: '',
    walletAddress: '',
    contact: ''
  });

  // Chart data
  const [incomeChartData, setIncomeChartData] = useState<any[]>([]);
  const [incomeStats, setIncomeStats] = useState({
    referral: 0,
    topup: 0,
    global: 0,
    level: 0,
    retopup: 0,
    bonus: 0
  });

  // Constants
  const ALLOWED_TOPUP_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000];
  const MIN_WITHDRAWAL = 10;
  const WITHDRAWAL_DEDUCTION = 15; // 15%

  useEffect(() => {
    if (currentUser && authUserData) {
      setUserData(authUserData as MLMUserData);
      setProfileData({
        displayName: authUserData.displayName || '',
        walletAddress: authUserData.walletAddress || '',
        contact: authUserData.contact || ''
      });
      fetchAllData();
      setLoading(false);
    }
  }, [currentUser, authUserData]);

  const fetchAllData = async () => {
    if (!currentUser) return;
    
    try {
      await Promise.all([
        fetchTransactions(),
        fetchIncomes(),
        fetchWithdrawals(),
        fetchReferrals(),
        setupRealtimeListeners()
      ]);
    } catch (error) {
      console.error('[Dashboard] Error fetching data:', error);
      setError('Failed to load dashboard data');
    }
  };

  const fetchTransactions = async () => {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const transactionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(transactionData);
    } catch (error) {
      console.error('[Dashboard] fetchTransactions error:', error);
    }
  };

  const fetchIncomes = async () => {
    try {
      const q = query(
        collection(db, 'incomes'),
        where('userId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const incomeData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Income[];
      
      setIncomes(incomeData);
      calculateIncomeStats(incomeData);
      generateIncomeChartData(incomeData);
    } catch (error) {
      console.error('[Dashboard] fetchIncomes error:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', currentUser?.uid),
        orderBy('requestedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const withdrawalData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Withdrawal[];
      setWithdrawals(withdrawalData);
    } catch (error) {
      console.error('[Dashboard] fetchWithdrawals error:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      if (!userData?.referrals || userData.referrals.length === 0) return;
      
      const referralPromises = userData.referrals.map(async (referralId) => {
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', referralId)));
        if (!userDoc.empty) {
          return { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as unknown as ReferralUser;
        }
        return null;
      });
      
      const referralData = (await Promise.all(referralPromises)).filter(Boolean) as ReferralUser[];
      setReferrals(referralData);
    } catch (error) {
      console.error('[Dashboard] fetchReferrals error:', error);
    }
  };

  const setupRealtimeListeners = () => {
    if (!currentUser) return;

    // Listen to user balance changes
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const updatedUserData = { id: doc.id, ...doc.data() } as unknown as MLMUserData;
        setUserData(updatedUserData);
      }
    });

    // Listen to pending withdrawals
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const pendingWithdrawals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Withdrawal[];
      setWithdrawals(prev => [...prev.filter(w => w.status !== 'pending'), ...pendingWithdrawals]);
    });

    return () => {
      unsubscribeUser();
      unsubscribeWithdrawals();
    };
  };

  const calculateIncomeStats = (incomeData: Income[]) => {
    const stats = {
      referral: 0,
      topup: 0,
      global: 0,
      level: 0,
      retopup: 0,
      bonus: 0
    };

    incomeData.forEach(income => {
      if (stats.hasOwnProperty(income.type)) {
        stats[income.type as keyof typeof stats] += income.amount;
      }
    });

    setIncomeStats(stats);
  };

  const generateIncomeChartData = (incomeData: Income[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        amount: 0
      };
    }).reverse();

    incomeData.forEach(income => {
      const incomeDate = income.createdAt instanceof Timestamp 
        ? income.createdAt.toDate() 
        : new Date(income.createdAt);
      const dateStr = incomeDate.toISOString().split('T')[0];
      
      const dayData = last7Days.find(day => day.date === dateStr);
      if (dayData) {
        dayData.amount += income.amount;
      }
    });

    setIncomeChartData(last7Days);
  };

  const handleTopup = async () => {
    if (!currentUser || !topupAmount) return;
    
    const amount = parseFloat(topupAmount);
    if (!ALLOWED_TOPUP_AMOUNTS.includes(amount)) {
      setError('Invalid topup amount. Please select from allowed amounts.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Import the processTopUp workflow function
      const { processTopUp } = await import('../services/firestoreService');
      
      // Use the comprehensive workflow function that handles:
      // 1. Creates transaction document in 'transactions' collection
      // 2. Creates income document in 'incomes' collection (if user has sponsor)
      // 3. Creates income transaction in 'incomeTransactions' collection
      // 4. Creates audit log in 'auditLogs' collection
      // 5. Updates user balance and cycles
      const result = await processTopUp(currentUser.uid, amount, 'USDT_BEP20');
      
      console.log('[Dashboard] TopUp workflow completed:', {
        transactionId: result.transactionId,
        incomeId: result.incomeId,
        incomeTransactionId: result.incomeTransactionId
      });

      // Update user balance locally
      if (userData) {
        const updatedUserData = {
          ...userData,
          balance: (userData.balance || 0) + amount,
          totalEarnings: (userData.totalEarnings || 0) + amount,
          updatedAt: new Date()
        };
        setUserData(updatedUserData);
        
        // Update user document in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          balance: updatedUserData.balance,
          totalEarnings: updatedUserData.totalEarnings,
          updatedAt: serverTimestamp()
        });
      }

      setShowTopupModal(false);
      setTopupAmount('');
      await fetchAllData();
      
      // Show success message
      alert(`TopUp of $${amount} completed successfully! All documents created in Firestore collections.`);
      
    } catch (error) {
      console.error('[Dashboard] Topup error:', error);
      setError('Failed to process topup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!currentUser || !withdrawAmount || !withdrawWallet) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}`);
      return;
    }

    if (amount > (userData?.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Import the processWithdrawal workflow function
      const { processWithdrawal } = await import('../services/firestoreService');
      
      // Use the comprehensive workflow function that handles:
      // 1. Creates withdrawal document in 'withdrawals' collection
      // 2. Creates payout queue document in 'payoutQueue' collection
      // 3. Creates audit log in 'auditLogs' collection
      // 4. Updates user balance
      const result = await processWithdrawal(currentUser.uid, amount, withdrawWallet);
      
      console.log('[Dashboard] Withdrawal workflow completed:', {
        withdrawalId: result.withdrawalId,
        payoutQueueId: result.payoutQueueId
      });

      // Update user balance locally
      if (userData) {
        const updatedUserData = {
          ...userData,
          balance: (userData.balance || 0) - amount,
          updatedAt: new Date()
        };
        setUserData(updatedUserData);
        
        // Update user document in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          balance: updatedUserData.balance,
          updatedAt: serverTimestamp()
        });
      }

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawWallet('');
      await fetchAllData();
      
      // Show success message
      const deductionAmount = (amount * WITHDRAWAL_DEDUCTION) / 100;
      const finalAmount = amount - deductionAmount;
      alert(`Withdrawal request of $${amount} submitted successfully! Final amount after ${WITHDRAWAL_DEDUCTION}% deduction: $${finalAmount.toFixed(2)}. All documents created in Firestore collections.`);
      
    } catch (error) {
      console.error('[Dashboard] Withdrawal error:', error);
      setError('Failed to process withdrawal request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!currentUser || !transferAmount || !transferTo) return;
    
    const amount = parseFloat(transferAmount);
    if (amount <= 0 || amount > (userData?.balance || 0)) {
      setError('Invalid transfer amount');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Import the transfer transaction function
      const { createTransferTransaction } = await import('../services/firestoreService');
      
      // Create transfer transactions with audit logging
      // This creates documents in 'transactions' and 'auditLogs' collections
      const senderTransactionId = await createTransferTransaction(
        currentUser.uid, 
        -amount, 
        'USDT_BEP20', 
        transferTo, 
        `Transfer to ${transferTo}`
      );
      
      const receiverTransactionId = await createTransferTransaction(
        transferTo, 
        amount, 
        'USDT_BEP20', 
        currentUser.uid, 
        `Transfer from ${currentUser.email}`
      );

      console.log('[Dashboard] Transfer transactions created:', {
        senderTransactionId,
        receiverTransactionId
      });

      // Update sender balance locally
      if (userData) {
        const updatedUserData = {
          ...userData,
          balance: (userData.balance || 0) - amount,
          updatedAt: new Date()
        };
        setUserData(updatedUserData);
        
        // Update sender balance in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          balance: updatedUserData.balance,
          updatedAt: serverTimestamp()
        });
        
        // Update receiver balance in Firestore
        const receiverRef = doc(db, 'users', transferTo);
        const receiverDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', transferTo)));
        if (!receiverDoc.empty) {
          const receiverData = receiverDoc.docs[0].data();
          await updateDoc(receiverRef, {
            balance: (receiverData.balance || 0) + amount,
            updatedAt: serverTimestamp()
          });
        }
      }

      setShowTransferModal(false);
      setTransferAmount('');
      setTransferTo('');
      await fetchAllData();
      
      // Show success message
      alert(`Transfer of $${amount} to ${transferTo} completed successfully! All documents created in Firestore collections.`);
      
    } catch (error) {
      console.error('[Dashboard] Transfer error:', error);
      setError('Failed to process transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRankUpgrade = async (newRank: string, activationAmount: number) => {
    if (!currentUser || !userData) return;
    
    if ((userData.balance || 0) < activationAmount) {
      setError(`Insufficient balance. You need $${activationAmount} to upgrade to ${newRank}.`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Import the processRankUpgrade workflow function
      const { processRankUpgrade } = await import('../services/firestoreService');
      
      // Use the comprehensive workflow function that handles:
      // 1. Creates transaction document in 'transactions' collection
      // 2. Creates rank document in 'ranks' collection
      // 3. Creates income document in 'incomes' collection (referral income for sponsor)
      // 4. Creates income transaction in 'incomeTransactions' collection (referral)
      // 5. Creates level income documents for upline chain (6 levels)
      // 6. Creates level income transactions for each eligible upline user
      // 7. Adds user to global cycle and processes payouts if cycle completes
      // 8. Creates audit log in 'auditLogs' collection
      // 9. Updates user rank and cycles in 'users' collection
      // 10. Updates cycle data in 'cycles' collection
      const result = await processRankUpgrade(currentUser.uid, newRank, activationAmount, 'USDT_BEP20');
      
      console.log('[Dashboard] Comprehensive rank upgrade workflow completed:', {
        transactionId: result.transactionId,
        rankDocumentId: result.rankDocumentId,
        incomeId: result.incomeId,
        incomeTransactionId: result.incomeTransactionId,
        levelIncomes: result.levelIncomes,
        globalCycleId: result.globalCycleId
      });

      // Update user data locally
      const updatedUserData = {
        ...userData,
        rank: newRank,
        balance: (userData.balance || 0) - activationAmount,
        activationAmount,
        cyclesCompleted: 0,
        rankActivatedAt: new Date(),
        updatedAt: new Date()
      };
      setUserData(updatedUserData);
      
      // Show comprehensive success message
      let successMessage = `Rank upgraded to ${newRank} successfully!\n\n`;
      successMessage += `✅ Transaction created: ${result.transactionId}\n`;
      successMessage += `✅ Rank document created: ${result.rankDocumentId}\n`;
      
      if (result.incomeId) {
        successMessage += `✅ Referral income created for sponsor\n`;
      }
      
      if (result.levelIncomes && result.levelIncomes.length > 0) {
        successMessage += `✅ Level incomes distributed to ${result.levelIncomes.length} upline users\n`;
      }
      
      if (result.globalCycleId) {
        successMessage += `✅ Added to global cycle: ${result.globalCycleId}\n`;
      }
      
      successMessage += `\nAll income distributions processed automatically!`;
      
      alert(successMessage);
      
    } catch (error) {
      console.error('[Dashboard] Rank upgrade error:', error);
      setError(error instanceof Error ? error.message : 'Rank upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      await updateUserData(profileData);
      setShowSettingsModal(false);
      console.log('[Dashboard] Profile updated successfully');
    } catch (error) {
      console.error('[Dashboard] Profile update error:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawalId), {
        status: 'cancelled',
        processedAt: serverTimestamp()
      });
      await fetchWithdrawals();
      console.log('[Dashboard] Withdrawal cancelled:', withdrawalId);
    } catch (error) {
      console.error('[Dashboard] Cancel withdrawal error:', error);
      setError('Failed to cancel withdrawal');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('[Dashboard] Logout error:', error);
    }
  };

  const formatDate = (date: Timestamp | Date | string | number) => {
    if (!date) return 'N/A';
    
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.38 0 2.5-1.12 2.5-2.5 0-.394-.094-.766-.26-1.094L13.864 4.224a2.5 2.5 0 00-3.728 0L3.822 15.406c-.166.328-.26.7-.26 1.094 0 1.38 1.12 2.5 2.5 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">User Data Not Found</h3>
          <p className="text-muted mb-6">Your user document is missing from Firestore. Please contact support to resolve this issue.</p>
          <button
            onClick={handleLogout}
            className="btn-primary"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Navbar */}
      <nav className="glass-card border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
                <h1 className="text-xl font-bold gradient-text">Way2Globe Wave</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted">
                Welcome, {userData.displayName || userData.email}
              </div>
              <div className="text-sm font-semibold text-accent">
                {formatCurrency(userData.balance || 0)}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 glass-card transform transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-5">
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-4 py-6 space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
                  { id: 'transactions', label: 'Transactions', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                  { id: 'incomes', label: 'Incomes', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' },
                  { id: 'referrals', label: 'Referrals & Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                  { id: 'ranks', label: 'Ranks & TopUp', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
                  { id: 'reids', label: 'REID Management', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.091 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z' },
                  { id: 'withdrawals', label: 'Withdrawals', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                  { id: 'settings', label: 'Settings & Profile', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                ))}
                
                {userData.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`sidebar-item ${activeTab === 'admin' ? 'active' : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Admin Panel
                  </button>
                )}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6 fade-in">
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <button
                      onClick={() => setShowTopupModal(true)}
                      className="btn-primary"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      TopUp
                    </button>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="btn-secondary"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Withdraw
                    </button>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="btn-secondary"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Transfer P2P
                    </button>
                  </div>

                  {/* Modern Dashboard Cards */}
                  <DashboardCards />

                  {/* Income Chart */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Income Last 7 Days</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={incomeChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#0EA5E9" 
                            strokeWidth={2}
                            dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Transactions */}
                    <div className="glass-card">
                      <div className="p-6 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                      </div>
                      <div className="p-6">
                        {transactions.length > 0 ? (
                          <div className="space-y-4">
                            {transactions.slice(0, 5).map((transaction) => (
                              <div key={transaction.id} className="table-row">
                                <div>
                                  <p className="font-medium text-white capitalize">{transaction.type}</p>
                                  <p className="text-sm text-muted">{formatDate(transaction.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                  </p>
                                  <p className={`text-sm ${
                                    transaction.status === 'completed' ? 'text-green-400' : 
                                    transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                                  }`}>
                                    {transaction.status}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted text-center py-8">No transactions found</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Incomes */}
                    <div className="glass-card">
                      <div className="p-6 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white">Recent Incomes</h3>
                      </div>
                      <div className="p-6">
                        {incomes.length > 0 ? (
                          <div className="space-y-4">
                            {incomes.slice(0, 5).map((income) => (
                              <div key={income.id} className="table-row">
                                <div>
                                  <p className="font-medium text-white capitalize">{income.type} Income</p>
                                  <p className="text-sm text-muted">{formatDate(income.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-green-400">+{formatCurrency(income.amount)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted text-center py-8">No income records found</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Transaction History</h2>
                  </div>
                  
                  <div className="glass-card">
                    <div className="p-6">
                      {transactions.length > 0 ? (
                        <div className="space-y-4">
                          {transactions.map((transaction) => (
                            <div key={transaction.id} className="table-row">
                              <div className="flex items-center space-x-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  transaction.type === 'topup' ? 'bg-green-500/20 text-green-400' :
                                  transaction.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                                  transaction.type === 'transfer' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                      transaction.type === 'topup' ? "M12 6v6m0 0v6m0-6h6m-6 0H6" :
                                      transaction.type === 'withdrawal' ? "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" :
                                      "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    } />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-white capitalize">{transaction.type}</p>
                                  <p className="text-sm text-muted">{transaction.description || 'No description'}</p>
                                  <p className="text-xs text-muted">{formatDate(transaction.createdAt)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                </p>
                                <span className={`status-badge ${transaction.status}`}>
                                  {transaction.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-muted">No transactions found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Incomes Tab */}
              {activeTab === 'incomes' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Income Summary</h2>
                  </div>
                  
                  {/* Income Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(incomeStats).map(([type, amount]) => (
                      <div key={type} className="stat-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted capitalize">{type} Income</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(amount)}</p>
                          </div>
                          <div className="stat-icon bg-blue-500/20 text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Income History */}
                  <div className="glass-card">
                    <div className="p-6 border-b border-white/10">
                      <h3 className="text-lg font-semibold text-white">Income History</h3>
                    </div>
                    <div className="p-6">
                      {incomes.length > 0 ? (
                        <div className="space-y-4">
                          {incomes.map((income) => (
                            <div key={income.id} className="table-row">
                              <div>
                                <p className="font-medium text-white capitalize">{income.type} Income</p>
                                <p className="text-sm text-muted">{income.description || 'No description'}</p>
                                <p className="text-xs text-muted">{formatDate(income.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-400">+{formatCurrency(income.amount)}</p>
                                {income.level && (
                                  <p className="text-xs text-muted">Level {income.level}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <p className="text-muted">No income records found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Referrals Tab */}
              {activeTab === 'referrals' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Referrals & Team</h2>
                  </div>
                  
                  {/* Referral Code */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Your Referral Code</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                        <p className="text-accent font-mono text-lg">{currentUser?.uid}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(currentUser?.uid || '')}
                        className="btn-secondary"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="glass-card">
                    <div className="p-6 border-b border-white/10">
                      <h3 className="text-lg font-semibold text-white">Your Team ({referrals.length})</h3>
                    </div>
                    <div className="p-6">
                      {referrals.length > 0 ? (
                        <div className="space-y-4">
                          {referrals.map((referral) => (
                            <div key={referral.uid} className="table-row">
                              <div>
                                <p className="font-medium text-white">{referral.displayName || referral.email}</p>
                                <p className="text-sm text-muted">Joined: {formatDate(referral.joinDate)}</p>
                                <p className="text-xs text-muted">Rank: {referral.rank || 'Starter'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-400">{formatCurrency(referral.totalEarnings)}</p>
                                <span className={`status-badge ${referral.status === 'active' ? 'completed' : 'pending'}`}>
                                  {referral.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-muted">No team members yet</p>
                          <p className="text-sm text-muted mt-2">Share your referral code to build your team</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ranks & TopUp Tab */}
              {activeTab === 'ranks' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Ranks & TopUp</h2>
                  </div>
                  
                  {/* Current Rank */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Current Rank</h3>
                    <div className="flex items-center space-x-4">
                      <div className="stat-icon bg-yellow-500/20 text-yellow-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{userData.rank || 'Starter'}</p>
                        <p className="text-muted">Cycles Completed: {userData.cyclesCompleted || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rank Upgrade Options */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Rank Upgrade Options</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Azurite Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Azurite', 5)}
                        disabled={userData.rank === 'Azurite' || (userData.balance || 0) < 5}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-blue-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Azurite</p>
                        <p className="text-sm text-accent">$5 USDT</p>
                        <p className="text-xs text-muted">Entry Level</p>
                      </button>

                      {/* Benitoite Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Benitoite', 10)}
                        disabled={userData.rank === 'Benitoite' || (userData.balance || 0) < 10}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-green-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Benitoite</p>
                        <p className="text-sm text-accent">$10 USDT</p>
                        <p className="text-xs text-muted">Basic Level</p>
                      </button>

                      {/* Crystals Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Crystals', 25)}
                        disabled={userData.rank === 'Crystals' || (userData.balance || 0) < 25}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-yellow-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Crystals</p>
                        <p className="text-sm text-accent">$25 USDT</p>
                        <p className="text-xs text-muted">Silver Level</p>
                      </button>

                      {/* Diamond Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Diamond', 50)}
                        disabled={userData.rank === 'Diamond' || (userData.balance || 0) < 50}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-red-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Diamond</p>
                        <p className="text-sm text-accent">$50 USDT</p>
                        <p className="text-xs text-muted">Gold Level</p>
                      </button>

                      {/* Emerald Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Emerald', 100)}
                        disabled={userData.rank === 'Emerald' || (userData.balance || 0) < 100}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-purple-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Emerald</p>
                        <p className="text-sm text-accent">$100 USDT</p>
                        <p className="text-xs text-muted">Platinum Level</p>
                      </button>

                      {/* Fluorite Rank */}
                      <button
                        onClick={() => handleRankUpgrade('Fluorite', 250)}
                        disabled={userData.rank === 'Fluorite' || (userData.balance || 0) < 250}
                        className="glass-card p-4 text-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-pink-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-white">Fluorite</p>
                        <p className="text-sm text-accent">$250 USDT</p>
                        <p className="text-xs text-muted">Diamond Level</p>
                      </button>
                    </div>
                  </div>

                  {/* TopUp Options */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">TopUp Options</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {ALLOWED_TOPUP_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setTopupAmount(amount.toString());
                            setShowTopupModal(true);
                          }}
                          className="glass-card p-4 text-center hover:bg-white/10 transition-colors"
                        >
                          <p className="text-xl font-bold text-accent">${amount}</p>
                          <p className="text-sm text-muted">TopUp</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Withdrawals Tab */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Withdrawals</h2>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="btn-primary"
                    >
                      Request Withdrawal
                    </button>
                  </div>
                  
                  <div className="glass-card">
                    <div className="p-6 border-b border-white/10">
                      <h3 className="text-lg font-semibold text-white">Withdrawal History</h3>
                    </div>
                    <div className="p-6">
                      {withdrawals.length > 0 ? (
                        <div className="space-y-4">
                          {withdrawals.map((withdrawal) => (
                            <div key={withdrawal.id} className="table-row">
                              <div>
                                <p className="font-medium text-white">{formatCurrency(withdrawal.amount)}</p>
                                <p className="text-sm text-muted">Final: {formatCurrency(withdrawal.finalAmount)} (after {withdrawal.deductionPercentage}% deduction)</p>
                                <p className="text-xs text-muted">{formatDate(withdrawal.requestedAt)}</p>
                                <p className="text-xs text-muted">Wallet: {withdrawal.walletAddress}</p>
                              </div>
                              <div className="text-right">
                                <span className={`status-badge ${withdrawal.status}`}>
                                  {withdrawal.status}
                                </span>
                                {withdrawal.status === 'pending' && (
                                  <button
                                    onClick={() => handleCancelWithdrawal(withdrawal.id)}
                                    className="block mt-2 text-xs text-red-400 hover:text-red-300"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <p className="text-muted">No withdrawal requests found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6 fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Settings & Profile</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Information */}
                     <div className="glass-card p-6">
                       <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Email</label>
                           <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                             <p className="text-white">{userData.email}</p>
                           </div>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">User ID</label>
                           <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                             <p className="text-white font-mono text-sm">{userData.uid}</p>
                           </div>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Join Date</label>
                           <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                             <p className="text-white">{formatDate(userData.createdAt)}</p>
                           </div>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Current Balance</label>
                           <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                             <p className="text-accent font-bold text-lg">{formatCurrency(userData.balance || 0)}</p>
                           </div>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Total Earnings</label>
                           <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                             <p className="text-green-400 font-bold text-lg">{formatCurrency(userData.totalEarnings || 0)}</p>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Editable Settings */}
                     <div className="glass-card p-6">
                       <h3 className="text-lg font-semibold text-white mb-4">Update Profile</h3>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Display Name</label>
                           <input
                             type="text"
                             value={profileData.displayName}
                             onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                             className="form-input"
                             placeholder="Enter your display name"
                           />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Wallet Address</label>
                           <input
                             type="text"
                             value={profileData.walletAddress}
                             onChange={(e) => setProfileData({...profileData, walletAddress: e.target.value})}
                             className="form-input"
                             placeholder="Enter your wallet address"
                           />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-muted mb-2">Contact</label>
                           <input
                             type="text"
                             value={profileData.contact}
                             onChange={(e) => setProfileData({...profileData, contact: e.target.value})}
                             className="form-input"
                             placeholder="Enter your contact information"
                           />
                         </div>
                         <button
                           onClick={handleUpdateProfile}
                           className="btn-primary w-full"
                           disabled={loading}
                         >
                           {loading ? 'Updating...' : 'Update Profile'}
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
               )}

               {/* REID Management Tab */}
               {activeTab === 'reids' && (
                 <REIDManagement 
                   onError={setError}
                   onSuccess={(message) => {
                     // You can add success notification logic here
                     console.log('REID Success:', message);
                   }}
                 />
               )}

               {/* Admin Panel Tab */}
               {activeTab === 'admin' && userData.role === 'admin' && (
                 <div className="space-y-6 fade-in">
                   <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                   </div>
                   
                   <div className="glass-card p-6">
                     <h3 className="text-lg font-semibold text-white mb-4">Pending Withdrawals</h3>
                     <div className="text-center py-8">
                       <p className="text-muted">Admin functionality coming soon...</p>
                       <p className="text-sm text-muted mt-2">This will include withdrawal approvals, user management, and audit logs.</p>
                     </div>
                   </div>
                 </div>
               )}

               {/* Error Display */}
               {error && (
                 <div className="fixed bottom-4 right-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg max-w-md z-50">
                   <div className="flex items-center justify-between">
                     <p className="text-sm">{error}</p>
                     <button 
                       onClick={() => setError('')}
                       className="ml-2 text-red-300 hover:text-red-100 text-lg font-bold"
                     >
                       ×
                     </button>
                   </div>
                 </div>
               )}
             </div>
           </main>
         </div>
       </div>

       {/* TopUp Modal */}
       {showTopupModal && (
         <div className="modal-overlay">
           <div className="modal-content">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-semibold text-white">TopUp Account</h3>
               <button
                 onClick={() => setShowTopupModal(false)}
                 className="text-muted hover:text-white"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Select Amount</label>
                 <div className="grid grid-cols-2 gap-3">
                   {ALLOWED_TOPUP_AMOUNTS.map((amount) => (
                     <button
                       key={amount}
                       onClick={() => setTopupAmount(amount.toString())}
                       className={`p-3 rounded-lg border text-center transition-colors ${
                         topupAmount === amount.toString()
                           ? 'border-accent bg-accent/20 text-accent'
                           : 'border-white/10 bg-white/5 text-white hover:border-accent/50'
                       }`}
                     >
                       ${amount}
                     </button>
                   ))}
                 </div>
               </div>
               
               <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                 <p className="text-blue-400 text-sm">
                   <strong>Note:</strong> TopUp will be processed immediately and added to your balance.
                 </p>
               </div>
               
               <div className="flex space-x-3">
                 <button
                   onClick={() => setShowTopupModal(false)}
                   className="btn-secondary flex-1"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleTopup}
                   className="btn-primary flex-1"
                   disabled={!topupAmount || loading}
                 >
                   {loading ? 'Processing...' : `TopUp $${topupAmount}`}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Withdrawal Modal */}
       {showWithdrawModal && (
         <div className="modal-overlay">
           <div className="modal-content">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-semibold text-white">Request Withdrawal</h3>
               <button
                 onClick={() => setShowWithdrawModal(false)}
                 className="text-muted hover:text-white"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Amount</label>
                 <input
                   type="number"
                   value={withdrawAmount}
                   onChange={(e) => setWithdrawAmount(e.target.value)}
                   className="form-input"
                   placeholder={`Min: $${MIN_WITHDRAWAL}`}
                   min={MIN_WITHDRAWAL}
                   max={userData?.balance || 0}
                 />
                 <p className="text-xs text-muted mt-1">
                   Available: {formatCurrency(userData?.balance || 0)}
                 </p>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Wallet Address</label>
                 <input
                   type="text"
                   value={withdrawWallet}
                   onChange={(e) => setWithdrawWallet(e.target.value)}
                   className="form-input"
                   placeholder="Enter your wallet address"
                 />
               </div>
               
               {withdrawAmount && parseFloat(withdrawAmount) >= MIN_WITHDRAWAL && (
                 <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                   <p className="text-yellow-400 text-sm">
                     <strong>Withdrawal Summary:</strong><br />
                     Amount: {formatCurrency(parseFloat(withdrawAmount))}<br />
                     Deduction ({WITHDRAWAL_DEDUCTION}%): {formatCurrency((parseFloat(withdrawAmount) * WITHDRAWAL_DEDUCTION) / 100)}<br />
                     <strong>Final Amount: {formatCurrency(parseFloat(withdrawAmount) - (parseFloat(withdrawAmount) * WITHDRAWAL_DEDUCTION) / 100)}</strong>
                   </p>
                 </div>
               )}
               
               <div className="flex space-x-3">
                 <button
                   onClick={() => setShowWithdrawModal(false)}
                   className="btn-secondary flex-1"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleWithdrawal}
                   className="btn-primary flex-1"
                   disabled={!withdrawAmount || !withdrawWallet || parseFloat(withdrawAmount) < MIN_WITHDRAWAL || loading}
                 >
                   {loading ? 'Processing...' : 'Request Withdrawal'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Transfer Modal */}
       {showTransferModal && (
         <div className="modal-overlay">
           <div className="modal-content">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-semibold text-white">Transfer P2P</h3>
               <button
                 onClick={() => setShowTransferModal(false)}
                 className="text-muted hover:text-white"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Amount</label>
                 <input
                   type="number"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                   className="form-input"
                   placeholder="Enter amount to transfer"
                   min="1"
                   max={userData?.balance || 0}
                 />
                 <p className="text-xs text-muted mt-1">
                   Available: {formatCurrency(userData?.balance || 0)}
                 </p>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Recipient User ID</label>
                 <input
                   type="text"
                   value={transferTo}
                   onChange={(e) => setTransferTo(e.target.value)}
                   className="form-input"
                   placeholder="Enter recipient's user ID"
                 />
               </div>
               
               <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                 <p className="text-blue-400 text-sm">
                   <strong>Note:</strong> Transfers are instant and cannot be reversed. Please verify the recipient ID carefully.
                 </p>
               </div>
               
               <div className="flex space-x-3">
                 <button
                   onClick={() => setShowTransferModal(false)}
                   className="btn-secondary flex-1"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleTransfer}
                   className="btn-primary flex-1"
                   disabled={!transferAmount || !transferTo || parseFloat(transferAmount) <= 0 || loading}
                 >
                   {loading ? 'Processing...' : 'Transfer'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Settings Modal */}
       {showSettingsModal && (
         <div className="modal-overlay">
           <div className="modal-content">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-semibold text-white">Update Profile</h3>
               <button
                 onClick={() => setShowSettingsModal(false)}
                 className="text-muted hover:text-white"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Display Name</label>
                 <input
                   type="text"
                   value={profileData.displayName}
                   onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                   className="form-input"
                   placeholder="Enter your display name"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Wallet Address</label>
                 <input
                   type="text"
                   value={profileData.walletAddress}
                   onChange={(e) => setProfileData({...profileData, walletAddress: e.target.value})}
                   className="form-input"
                   placeholder="Enter your wallet address"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-muted mb-2">Contact</label>
                 <input
                   type="text"
                   value={profileData.contact}
                   onChange={(e) => setProfileData({...profileData, contact: e.target.value})}
                   className="form-input"
                   placeholder="Enter your contact information"
                 />
               </div>
               
               <div className="flex space-x-3">
                 <button
                   onClick={() => setShowSettingsModal(false)}
                   className="btn-secondary flex-1"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleUpdateProfile}
                   className="btn-primary flex-1"
                   disabled={loading}
                 >
                   {loading ? 'Updating...' : 'Update Profile'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

 export default Dashboard;