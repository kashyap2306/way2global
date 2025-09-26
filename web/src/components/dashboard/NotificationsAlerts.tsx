import React, { useState } from 'react';
import { 
  BellIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

interface NotificationsAlertsProps {
  pendingWithdrawals?: number;
  pendingWithdrawalAmount?: number;
  autoTopUpEnabled?: boolean;
  nextTopUpDate?: Date;
  lowBalanceWarning?: boolean;
  currentBalance?: number;
  minimumBalance?: number;
  customNotifications?: Notification[];
  loading?: boolean;
}

const NotificationsAlerts: React.FC<NotificationsAlertsProps> = ({
  pendingWithdrawals = 0,
  pendingWithdrawalAmount = 0,
  autoTopUpEnabled = false,
  nextTopUpDate,
  lowBalanceWarning = false,
  currentBalance = 0,
  minimumBalance = 100,
  customNotifications = [],
  loading = false
}) => {
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
  };

  // Generate system notifications
  const systemNotifications: Notification[] = [];

  // Pending withdrawals notification
  if (pendingWithdrawals > 0) {
    systemNotifications.push({
      id: 'pending-withdrawals',
      type: 'info',
      title: 'Pending Withdrawals',
      message: `You have ${pendingWithdrawals} pending withdrawal${pendingWithdrawals > 1 ? 's' : ''} totaling ${formatCurrency(pendingWithdrawalAmount)}`,
      timestamp: new Date(),
      actionLabel: 'View Details',
      onAction: () => console.log('Navigate to withdrawals page'),
      dismissible: true
    });
  }

  // Auto top-up status
  if (autoTopUpEnabled && nextTopUpDate) {
    const isUpcoming = new Date(nextTopUpDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // Within 24 hours
    systemNotifications.push({
      id: 'auto-topup',
      type: isUpcoming ? 'warning' : 'info',
      title: 'Auto Top-up Scheduled',
      message: `Next auto top-up scheduled for ${formatDate(nextTopUpDate)}`,
      timestamp: new Date(),
      actionLabel: 'Manage Settings',
      onAction: () => console.log('Navigate to settings'),
      dismissible: true
    });
  } else if (!autoTopUpEnabled) {
    systemNotifications.push({
      id: 'auto-topup-disabled',
      type: 'warning',
      title: 'Auto Top-up Disabled',
      message: 'Enable auto top-up to maintain your rank automatically',
      timestamp: new Date(),
      actionLabel: 'Enable Now',
      onAction: () => console.log('Enable auto top-up'),
      dismissible: true
    });
  }

  // Low balance warning
  if (lowBalanceWarning && currentBalance < minimumBalance) {
    systemNotifications.push({
      id: 'low-balance',
      type: 'error',
      title: 'Low Balance Warning',
      message: `Your balance (${formatCurrency(currentBalance)}) is below the recommended minimum of ${formatCurrency(minimumBalance)}`,
      timestamp: new Date(),
      actionLabel: 'Add Funds',
      onAction: () => console.log('Navigate to add funds'),
      dismissible: false
    });
  }

  // Combine system and custom notifications
  const allNotifications = [...systemNotifications, ...customNotifications]
    .filter(notification => !dismissedNotifications.has(notification.id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Notifications & Alerts</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
              <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BellIcon className="w-5 h-5 mr-2 text-gray-500" />
            Notifications & Alerts
          </h3>
          {allNotifications.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {allNotifications.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {allNotifications.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 ${getNotificationStyles(notification.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatDate(notification.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {notification.message}
                      </p>
                      {notification.actionLabel && notification.onAction && (
                        <button
                          onClick={notification.onAction}
                          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {notification.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                  {notification.dismissible && (
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="ml-4 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Status Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Auto Top-up Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ArrowUpIcon className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Auto Top-up</span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                autoTopUpEnabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {autoTopUpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {autoTopUpEnabled && nextTopUpDate && (
              <p className="mt-1 text-xs text-gray-500">
                Next: {formatDate(nextTopUpDate)}
              </p>
            )}
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Withdrawals</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {pendingWithdrawals}
              </span>
            </div>
            {pendingWithdrawals > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(pendingWithdrawalAmount)} pending
              </p>
            )}
          </div>

          {/* Balance Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Balance</span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                currentBalance >= minimumBalance 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentBalance >= minimumBalance ? 'Good' : 'Low'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formatCurrency(currentBalance)} available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsAlerts;