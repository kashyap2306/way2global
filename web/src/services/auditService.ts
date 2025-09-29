import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AuditLog {
  id?: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'withdrawal' | 'topup' | 'settings' | 'system';
  targetId?: string;
  details: {
    before?: any;
    after?: any;
    reason?: string;
    amount?: number;
    status?: string;
    [key: string]: any;
  };
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = 
  | 'user_suspended'
  | 'user_reactivated'
  | 'user_updated'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'topup_approved'
  | 'topup_rejected'
  | 'settings_updated'
  | 'user_balance_updated'
  | 'user_rank_updated'
  | 'admin_login'
  | 'admin_logout'
  | 'bulk_action_performed';

class AuditService {
  private collectionName = 'auditLogs';

  /**
   * Log an admin action
   */
  async logAction(
    adminId: string,
    adminEmail: string,
    action: AuditAction,
    targetType: AuditLog['targetType'],
    details: AuditLog['details'],
    targetId?: string
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        adminId,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
        timestamp: Timestamp.now(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      await addDoc(collection(db, this.collectionName), auditLog);
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }

  /**
   * Log user suspension
   */
  async logUserSuspension(
    adminId: string,
    adminEmail: string,
    userId: string,
    reason: string,
    userBefore: any
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'user_suspended',
      'user',
      {
        reason,
        before: { status: userBefore.status },
        after: { status: 'suspended' }
      },
      userId
    );
  }

  /**
   * Log user reactivation
   */
  async logUserReactivation(
    adminId: string,
    adminEmail: string,
    userId: string,
    userBefore: any
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'user_reactivated',
      'user',
      {
        before: { status: userBefore.status },
        after: { status: 'active' }
      },
      userId
    );
  }

  /**
   * Log withdrawal approval
   */
  async logWithdrawalApproval(
    adminId: string,
    adminEmail: string,
    withdrawalId: string,
    amount: number,
    finalAmount: number,
    fees: { withdrawalFee: number; fundConvertFee: number }
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'withdrawal_approved',
      'withdrawal',
      {
        amount,
        finalAmount,
        fees,
        before: { status: 'pending' },
        after: { status: 'approved' }
      },
      withdrawalId
    );
  }

  /**
   * Log withdrawal rejection
   */
  async logWithdrawalRejection(
    adminId: string,
    adminEmail: string,
    withdrawalId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'withdrawal_rejected',
      'withdrawal',
      {
        amount,
        reason,
        before: { status: 'pending' },
        after: { status: 'rejected' }
      },
      withdrawalId
    );
  }

  /**
   * Log topup approval
   */
  async logTopupApproval(
    adminId: string,
    adminEmail: string,
    topupId: string,
    userId: string,
    amount: number,
    rank: string
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'topup_approved',
      'topup',
      {
        amount,
        rank,
        userId,
        before: { status: 'pending' },
        after: { status: 'approved' }
      },
      topupId
    );
  }

  /**
   * Log topup rejection
   */
  async logTopupRejection(
    adminId: string,
    adminEmail: string,
    topupId: string,
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'topup_rejected',
      'topup',
      {
        amount,
        userId,
        reason,
        before: { status: 'pending' },
        after: { status: 'rejected' }
      },
      topupId
    );
  }

  /**
   * Log settings update
   */
  async logSettingsUpdate(
    adminId: string,
    adminEmail: string,
    settingType: string,
    before: any,
    after: any
  ): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'settings_updated',
      'settings',
      {
        settingType,
        before,
        after
      }
    );
  }

  /**
   * Log admin login
   */
  async logAdminLogin(adminId: string, adminEmail: string): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'admin_login',
      'system',
      {
        loginTime: new Date().toISOString()
      }
    );
  }

  /**
   * Log admin logout
   */
  async logAdminLogout(adminId: string, adminEmail: string): Promise<void> {
    await this.logAction(
      adminId,
      adminEmail,
      'admin_logout',
      'system',
      {
        logoutTime: new Date().toISOString()
      }
    );
  }

  /**
   * Get audit logs with pagination and filtering
   */
  async getAuditLogs(
    limitCount: number = 50,
    adminId?: string,
    action?: AuditAction,
    targetType?: AuditLog['targetType']
  ): Promise<AuditLog[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (adminId) {
        q = query(q, where('adminId', '==', adminId));
      }

      if (action) {
        q = query(q, where('action', '==', action));
      }

      if (targetType) {
        q = query(q, where('targetType', '==', targetType));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get recent admin activities
   */
  async getRecentActivities(limitCount: number = 20): Promise<AuditLog[]> {
    return this.getAuditLogs(limitCount);
  }

  /**
   * Get admin activities by date range
   */
  async getActivitiesByDateRange(
    startDate: Date,
    endDate: Date,
    limitCount: number = 100
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
    } catch (error) {
      console.error('Error fetching activities by date range:', error);
      return [];
    }
  }

  /**
   * Log user profile update
   */
  async logUserUpdate(
    adminId: string,
    adminEmail: string,
    userId: string,
    updates: any,
    userBefore: any
  ): Promise<void> {
    try {
      await this.logAction(
        adminId,
        adminEmail,
        'user_updated',
        'user',
        {
          before: userBefore,
          after: updates,
          updatedFields: Object.keys(updates)
        },
        userId
      );
    } catch (error) {
      console.error('Error logging user update:', error);
    }
  }

  /**
   * Get client IP address (simplified version)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real application, you might want to use a service to get the actual IP
      // For now, we'll return a placeholder
      return 'client-ip';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Format audit log for display
   */
  formatAuditLog(log: AuditLog): string {
    const actionDescriptions: Record<AuditAction, string> = {
      user_suspended: 'suspended user',
      user_reactivated: 'reactivated user',
      user_updated: 'updated user profile',
      withdrawal_approved: 'approved withdrawal',
      withdrawal_rejected: 'rejected withdrawal',
      topup_approved: 'approved topup',
      topup_rejected: 'rejected topup',
      settings_updated: 'updated settings',
      user_balance_updated: 'updated user balance',
      user_rank_updated: 'updated user rank',
      admin_login: 'logged in',
      admin_logout: 'logged out',
      bulk_action_performed: 'performed bulk action'
    };

    const actionDesc = actionDescriptions[log.action as AuditAction] || log.action;
    const timestamp = log.timestamp.toDate().toLocaleString();
    
    return `${log.adminEmail} ${actionDesc} at ${timestamp}`;
  }
}

export const auditService = new AuditService();
export default auditService;