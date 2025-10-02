import { collection, doc, getDoc, getDocs, query, orderBy, limit, Timestamp, writeBatch, increment, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auditService } from './auditService';

export interface AdminUser {
  uid: string;
  userCode?: string;
  displayName: string;
  email: string;
  contact?: string;
  rank: string;
  status: string;
  balance: number;
  directReferrals: number;
  activationDate?: Timestamp;
  levelWiseIncome?: Record<string, number>;
  isActive: boolean;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  directReferralCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  walletAddress?: string;
  feeAmount?: number;
  finalAmount?: number;
}

export interface TopupRequest {
  id: string;
  userId: string;
  userCode?: string;
  userEmail: string;
  userName: string;
  amount: number;
  rank: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  paymentMethod?: string;
  transactionId?: string;
  txHash?: string;
  userRank?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: Record<string, any>;
  timestamp: Timestamp;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingWithdrawals: number;
  approvedWithdrawals: number;
  totalWithdrawalAmount: number;
  pendingTopups: number;
  totalIncomeDistributed: number;
}

class AdminService {
  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const suspendedUsers = users.filter(user => user.status === 'suspended').length;

      // Get withdrawals
      const withdrawalsSnapshot = await getDocs(collection(db, 'withdrawals'));
      const withdrawals = withdrawalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
      const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved').length;
      const totalWithdrawalAmount = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + (w.amount || 0), 0);

      // Get topups
      const topupsSnapshot = await getDocs(collection(db, 'topups'));
      const topups = topupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const pendingTopups = topups.filter(t => t.type === 'topup' && t.status === 'pending').length;

      // Calculate total income distributed
      const totalIncomeDistributed = users.reduce((sum, user) => sum + ((user as any).balance || 0), 0);

      return {
        totalUsers,
        activeUsers,
        suspendedUsers,
        pendingWithdrawals,
        approvedWithdrawals,
        totalWithdrawalAmount,
        pendingTopups,
        totalIncomeDistributed
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // User Management
  async getAllUsers(searchTerm?: string, statusFilter?: string, rankFilter?: string): Promise<AdminUser[]> {
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      let users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as AdminUser[];

      // Apply filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        users = users.filter(user => 
          user.displayName?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.uid.toLowerCase().includes(term)
        );
      }

      if (statusFilter && statusFilter !== 'all') {
        users = users.filter(user => user.status === statusFilter);
      }

      if (rankFilter && rankFilter !== 'all') {
        users = users.filter(user => user.rank === rankFilter);
      }

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userBefore = userDoc.data();
      
      await updateDoc(userRef, {
        status: 'suspended',
        suspendedAt: Timestamp.now(),
        suspensionReason: reason,
        updatedAt: Timestamp.now()
      });

      // Log the action
      await auditService.logUserSuspension(adminId, adminEmail, userId, reason, userBefore);
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Reactivate a suspended user
   */
  async reactivateUser(userId: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userBefore = userDoc.data();
      
      await updateDoc(userRef, {
        status: 'active',
        suspendedAt: null,
        suspensionReason: null,
        reactivatedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Log the action
      await auditService.logUserReactivation(adminId, adminEmail, userId, userBefore);
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }

  // Withdrawal Management
  async getAllWithdrawals(statusFilter?: string): Promise<WithdrawalRequest[]> {
    try {
      let q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      let withdrawals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];

      if (statusFilter && statusFilter !== 'all') {
        withdrawals = withdrawals.filter(w => w.status === statusFilter);
      }

      return withdrawals;
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  }

  async approveWithdrawal(withdrawalId: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get withdrawal details
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalDoc.data();
      const amount = withdrawal.amount;
      
      // Calculate fees: 15% withdrawal fee + 10% fund convert
       const withdrawalFee = amount * 0.15;
       const fundConvertFee = amount * 0.10;
       const finalAmount = amount - withdrawalFee - fundConvertFee;

      // Update withdrawal status
      batch.update(withdrawalRef, {
         status: 'approved',
         processedAt: Timestamp.now(),
         processedBy: adminId,
         feeAmount: withdrawalFee + fundConvertFee,
         finalAmount
       });

      await batch.commit();

      // Log the action
      await auditService.logWithdrawalApproval(
        adminId, 
        adminEmail, 
        withdrawalId, 
        amount, 
        finalAmount, 
        { withdrawalFee, fundConvertFee }
      );
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      throw error;
    }
  }

  async rejectWithdrawal(withdrawalId: string, reason: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) {
        throw new Error('Withdrawal request not found');
      }

      const withdrawal = withdrawalDoc.data();
      const batch = writeBatch(db);

      // Update withdrawal status
      batch.update(withdrawalRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: adminId,
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      });

      // Refund the amount to user balance
      const userRef = doc(db, 'users', withdrawal.userId);
      batch.update(userRef, {
        balance: increment(withdrawal.amount),
        updatedAt: Timestamp.now()
      });

      await batch.commit();

      // Log the action
      await auditService.logWithdrawalRejection(
        adminId, 
        adminEmail, 
        withdrawalId, 
        withdrawal.amount, 
        reason
      );
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      throw error;
    }
  }

  // Topup Management
  async getAllTopups(statusFilter?: string): Promise<TopupRequest[]> {
    try {
      let q = query(
        collection(db, 'topups'), 
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      let topups = await Promise.all(snapshot.docs.map(async topupDoc => {
        const topupData = topupDoc.data() as TopupRequest;
        const userDoc = await getDoc(doc(db, 'users', topupData.userId));
        const userData = userDoc.data();
        return {
          ...topupData,
          id: topupDoc.id, // Ensure id is explicitly included
          userName: userData?.displayName,
          userCode: userData?.userCode,
          userStatus: userData?.status,
          userRank: userData?.currentRank
        };
      }));

      if (statusFilter && statusFilter !== 'all') {
        topups = topups.filter(t => t.status === statusFilter);
      }

      return topups;
    } catch (error) {
      console.error('Error fetching topups:', error);
      throw error;
    }
  }

  async approveTopup(topupId: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get topup details
      const topupRef = doc(db, 'topups', topupId);
      const topupDoc = await getDoc(topupRef);
      
      if (!topupDoc.exists()) {
        throw new Error('Topup not found');
      }

      const topup = topupDoc.data();

      // Update topup status
      batch.update(topupRef, {
        status: 'approved',
        processedAt: Timestamp.now(),
        processedBy: adminId
      });

      // Update user's activation status and balance
      const userRef = doc(db, 'users', topup.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        batch.update(userRef, {
          balance: increment(topup.amount),
          lockedBalance: increment(topup.amount)
        });

        // Record the transaction
        const transactionRef = doc(collection(db, 'transactions'));
        batch.set(transactionRef, {
          id: transactionRef.id,
          userId: topup.userId,
          type: 'topup',
          amount: topup.amount,
          status: 'completed',
          createdAt: Timestamp.now(),
          transactionId: topup.transactionId || null,
          paymentMethod: topup.paymentMethod || null,
          userName: topup.userName || null,
          userCode: topup.userCode || null,
        });
      }

      await batch.commit();

      // Log the action
      await auditService.logTopupApproval(
        adminId, 
        adminEmail, 
        topupId, 
        topup.userId, 
        topup.amount, 
        topup.rank || 'Bronze'
      );
    } catch (error) {
      console.error('Error approving topup:', error);
      throw error;
    }
  }

  /**
   * Reject a topup request
   */
  async rejectTopup(topupId: string, reason: string, adminId: string, adminEmail: string): Promise<void> {
    try {
      const topupRef = doc(db, 'topups', topupId);
      const topupDoc = await getDoc(topupRef);
      
      if (!topupDoc.exists()) {
        throw new Error('Topup request not found');
      }

      const topup = topupDoc.data();
      const batch = writeBatch(db);

      // Update topup status
      batch.update(topupRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: adminId,
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      });

      await batch.commit();

      // Log the action
      await auditService.logTopupRejection(
        adminId, 
        adminEmail, 
        topupId, 
        topup.userId, 
        topup.amount, 
        reason
      );
    } catch (error) {
      console.error('Error rejecting topup:', error);
      throw error;
    }
  }

  /**
   * Update user details
   */
  async updateUser(userId: string, updates: Partial<AdminUser>, adminId: string, adminEmail: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userBefore = userDoc.data();
      
      // Prepare update data (exclude uid from updates)
      const { uid, ...updateData } = updates;
      
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: Timestamp.now()
      });

      // Log the action
      await auditService.logUserUpdate(adminId, adminEmail, userId, updateData, userBefore);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Audit Logs
  async getAuditLogs(limitCount: number = 50): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();