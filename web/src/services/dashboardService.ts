import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Dashboard data interface
export interface DashboardData {
  topUpIncome: number;
  reTopupIncome: number;
  globalIncome: number;
  reGlobalIncome: number;
  levelIncome: number;
  directReferralCount: number;
  totalTeamCount: number;
  availableBalance: number;
  totalWithdrawals: number;
  lockedBalance: number;
  autopoolPosition?: number; // New field for autopool position
  autopoolEarnings?: number; // New field for autopool earnings
}

// User data interface for internal use
interface UserData {
  availableBalance: number; // Changed from 'balance' to 'availableBalance'
  lockedBalance: number;
  referrals: string[];
}

// Income type mapping
const INCOME_TYPE_MAPPING = {
  'referral': 'topUpIncome',
  'level': 'levelIncome',
  'global': 'globalIncome',
  're-topup': 'reTopupIncome',
  're-global': 'reGlobalIncome'
} as const;

/**
 * Dashboard Service Class
 * Handles all dashboard data fetching and real-time updates
 */
export class DashboardService {
  private unsubscribers: (() => void)[] = [];

  /**
   * Fetch complete dashboard data for a user
   */
  async fetchDashboardData(userId: string): Promise<DashboardData> {
    try {
      // Initialize data object
      const data: DashboardData = {
        topUpIncome: 0,
        reTopupIncome: 0,
        globalIncome: 0,
        reGlobalIncome: 0,
        levelIncome: 0,
        directReferralCount: 0,
        totalTeamCount: 0,
        availableBalance: 0,
        totalWithdrawals: 0,
        lockedBalance: 0,
        autopoolPosition: 0, // Initialize new field
        autopoolEarnings: 0, // Initialize new field
      };

      // Fetch user basic data
      const userData = await this.fetchUserData(userId);
      data.availableBalance = userData.availableBalance || 0;
      data.lockedBalance = userData.lockedBalance || 0; // Initialize from user doc

      // Calculate locked balance from income pools
      data.lockedBalance += await this.fetchIncomePoolsLockedBalance(userId);
      data.directReferralCount = userData.referrals?.length || 0;

      // Fetch income data
      const incomeData = await this.fetchIncomeData(userId);
      Object.assign(data, incomeData);

      // Fetch autopool data
      const autopoolData = await this.fetchAutopoolData(userId);
      Object.assign(data, autopoolData);

      // Fetch withdrawal data
      data.totalWithdrawals = await this.fetchWithdrawalData(userId);

      // Calculate total team count
      data.totalTeamCount = await this.calculateTeamCount(userId);

      return data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private async fetchIncomePoolsLockedBalance(userId: string): Promise<number> {
    const incomePoolsRef = collection(db, 'incomePools');
    const q = query(incomePoolsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    let lockedBalance = 0;
    querySnapshot.forEach((doc) => {
      lockedBalance += doc.data().amount || 0;
    });
    return lockedBalance;
  }

  /**
   * Set up real-time listeners for dashboard data
   */
  setupRealTimeListeners(
    userId: string,
    onUpdate: (data: Partial<DashboardData>) => void,
    onError: (error: Error) => void
  ): () => void {
    // User data listener
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', userId),
      async (doc) => {
        if (doc.exists()) {
          const userData = doc.data() as UserData;
          let lockedBalance = userData.lockedBalance || 0;
          lockedBalance += await this.fetchIncomePoolsLockedBalance(userId);
          onUpdate({
            availableBalance: userData.availableBalance || 0,
            lockedBalance: lockedBalance,
            directReferralCount: userData.referrals?.length || 0,
          });
        }
      },
      onError
    );

    // Income data listener
    const incomeUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', userId, 'incomes'),
        orderBy('createdAt', 'desc'),
        limit(100)
      ),
      async (snapshot) => {
        const incomeData = await this.processIncomeSnapshot(snapshot);
        onUpdate(incomeData);
      },
      onError
    );

    // Withdrawal data listener
    const withdrawalUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', userId, 'withdrawals'),
        where('status', '==', 'completed')
      ),
      (snapshot) => {
        let totalWithdrawals = 0;
        snapshot.forEach((doc) => {
          const withdrawal = doc.data();
          totalWithdrawals += withdrawal.amountRequested || 0;
        });
        onUpdate({ totalWithdrawals });
      },
      onError
    );

    // Income pools listener for locked balance
    const incomePoolsUnsubscribe = onSnapshot(
      query(collection(db, 'incomePools'), where('userId', '==', userId), where('status', '==', 'active')),
      async (snapshot) => {
        let lockedBalanceFromPools = 0;
        snapshot.forEach((doc) => {
          lockedBalanceFromPools += doc.data().amount || 0;
        });
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data() as UserData;
        onUpdate({
          lockedBalance: (userData.lockedBalance || 0) + lockedBalanceFromPools,
        });
      },
      onError
    );

    // Autopool data listener
    const autopoolUnsubscribe = onSnapshot(
      doc(db, 'autopool', userId),
      (doc) => {
        if (doc.exists()) {
          const autopoolData = doc.data();
          onUpdate({
            autopoolPosition: autopoolData.position || 0,
            autopoolEarnings: autopoolData.totalEarnings || 0,
          });
        }
      },
      onError
    );

    this.unsubscribers = [userUnsubscribe, incomeUnsubscribe, withdrawalUnsubscribe, incomePoolsUnsubscribe, autopoolUnsubscribe];

    // Return cleanup function
    return () => {
      this.cleanup();
    };
  }

  /**
   * Fetch user basic data
   */
  private async fetchUserData(userId: string): Promise<any> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }
    return userDoc.data();
  }

  /**
   * Fetch and process income data
   */
  private async fetchIncomeData(userId: string): Promise<Partial<DashboardData>> {
    const incomesQuery = query(
      collection(db, 'users', userId, 'incomes'),
      orderBy('createdAt', 'desc')
    );

    const incomesSnapshot = await getDocs(incomesQuery);
    return this.processIncomeSnapshot(incomesSnapshot);
  }

  /**
   * Process income snapshot data
   */
  private async processIncomeSnapshot(snapshot: any): Promise<Partial<DashboardData>> {
    const incomeData: Partial<DashboardData> = {
      topUpIncome: 0,
      reTopupIncome: 0,
      globalIncome: 0,
      reGlobalIncome: 0,
      levelIncome: 0,
    };

    snapshot.forEach((doc: any) => {
      const income = doc.data();
      const amount = income.amount || 0;
      const type = income.type as keyof typeof INCOME_TYPE_MAPPING;
      
      if (type && INCOME_TYPE_MAPPING[type]) {
        const dataKey = INCOME_TYPE_MAPPING[type] as keyof typeof incomeData;
        if (incomeData[dataKey] !== undefined) {
          (incomeData[dataKey] as number) += amount;
        }
      }
    });

    return incomeData;
  }

  /**
   * Fetch withdrawal data
   */
  private async fetchWithdrawalData(userId: string): Promise<number> {
    const withdrawalsQuery = query(
      collection(db, 'users', userId, 'withdrawals'),
      where('status', '==', 'completed')
    );

    const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
    let totalWithdrawals = 0;

    withdrawalsSnapshot.forEach((doc) => {
      const withdrawal = doc.data();
      totalWithdrawals += withdrawal.amountRequested || 0;
    });

    return totalWithdrawals;
  }

  /**
   * Calculate total team count recursively
   */
  private async calculateTeamCount(
    userId: string, 
    visited = new Set<string>(),
    maxDepth = 10,
    currentDepth = 0
  ): Promise<number> {
    // Prevent infinite loops and limit depth
    if (visited.has(userId) || currentDepth >= maxDepth) return 0;
    visited.add(userId);

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData?.referrals || !Array.isArray(userData.referrals)) return 0;

      let count = userData.referrals.length;
      
      // Recursively count team members
      for (const referralId of userData.referrals) {
        if (typeof referralId === 'string' && referralId.trim()) {
          count += await this.calculateTeamCount(referralId, visited, maxDepth, currentDepth + 1);
        }
      }

      return count;
    } catch (error) {
      console.error(`Error calculating team count for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary(userId: string): Promise<{
    totalEarnings: number;
    activeIncomeStreams: number;
    monthlyGrowth: number;
  }> {
    try {
      const data = await this.fetchDashboardData(userId);
      
      const totalEarnings = 
        data.topUpIncome + 
        data.reTopupIncome + 
        data.globalIncome + 
        data.reGlobalIncome + 
        data.levelIncome;

      const activeIncomeStreams = [
        data.topUpIncome,
        data.reTopupIncome,
        data.globalIncome,
        data.reGlobalIncome,
        data.levelIncome
      ].filter(income => income > 0).length;

      // Calculate monthly growth (simplified - would need historical data for accurate calculation)
      const monthlyGrowth = totalEarnings > 0 ? Math.random() * 20 - 10 : 0; // Placeholder

      return {
        totalEarnings,
        activeIncomeStreams,
        monthlyGrowth
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      return {
        totalEarnings: 0,
        activeIncomeStreams: 0,
        monthlyGrowth: 0
      };
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanup(): void {
    this.unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up listener:', error);
      }
    });
    this.unsubscribers = [];
  }

  private async fetchAutopoolData(userId: string): Promise<Partial<DashboardData>> {
    try {
      const autopoolEntryRef = doc(db, 'autopool', userId);
      const autopoolDoc = await getDoc(autopoolEntryRef);

      if (autopoolDoc.exists()) {
        const autopoolData = autopoolDoc.data();
        return {
          autopoolPosition: autopoolData.position || 0,
          autopoolEarnings: autopoolData.totalEarnings || 0, // Assuming totalEarnings field in autopool entry
        };
      }
      return { autopoolPosition: 0, autopoolEarnings: 0 };
    } catch (error) {
      console.error('Error fetching autopool data:', error);
      return { autopoolPosition: 0, autopoolEarnings: 0 };
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();

// Export utility functions
export const formatDashboardValue = (value: number, type: 'currency' | 'count' = 'currency'): string => {
  if (type === 'count') {
    return value.toLocaleString();
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const getDashboardCardColor = (index: number): string => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-indigo-500 to-indigo-600',
    'from-cyan-500 to-cyan-600',
    'from-emerald-500 to-emerald-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-red-500 to-red-600'
  ];
  
  return colors[index % colors.length];
};
