import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  UsersIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { adminService } from '../../services/adminService';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingWithdrawals: number;
  approvedWithdrawals: number;
  totalWithdrawalAmount: number;
  pendingTopups: number;
  totalIncomeDistributed: number;
}

const AdminDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    totalWithdrawalAmount: 0,
    pendingTopups: 0,
    totalIncomeDistributed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const dashboardData = await adminService.getDashboardStats();
      setStats(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-100'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: CheckCircleIcon,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-100'
    },
    {
      title: 'Suspended Users',
      value: stats.suspendedUsers,
      icon: ExclamationTriangleIcon,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-100'
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      icon: ClockIcon,
      color: 'from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-100'
    },
    {
      title: 'Approved Withdrawals',
      value: stats.approvedWithdrawals,
      icon: CheckCircleIcon,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-100'
    },
    {
      title: 'Total Withdrawal Amount',
      value: `$${stats.totalWithdrawalAmount.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-100'
    },
    {
      title: 'Pending Topups',
      value: stats.pendingTopups,
      icon: DocumentTextIcon,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-100'
    },
    {
      title: 'Total Income Distributed',
      value: `$${stats.totalIncomeDistributed.toLocaleString()}`,
      icon: ChartBarIcon,
      color: 'from-teal-500 to-teal-600',
      textColor: 'text-teal-100'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Welcome back, {userData?.displayName}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`bg-gradient-to-r ${card.color} rounded-xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${card.textColor} text-sm font-medium opacity-80`}>
                    {card.title}
                  </p>
                  <p className="text-white text-2xl font-bold mt-1">
                    {card.value}
                  </p>
                </div>
                <card.icon className="h-8 w-8 text-white opacity-80" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                Manage Users
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                Review Withdrawals
              </button>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                Approve Topups
              </button>
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors">
                System Settings
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>New user registered</span>
                <span>2 min ago</span>
              </div>
              <div className="flex justify-between">
                <span>Withdrawal approved</span>
                <span>5 min ago</span>
              </div>
              <div className="flex justify-between">
                <span>Topup processed</span>
                <span>10 min ago</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database</span>
                <span className="text-green-400 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Payment Gateway</span>
                <span className="text-green-400 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Email Service</span>
                <span className="text-green-400 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">Alerts</h3>
            <div className="space-y-3">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-300 text-sm">
                  {stats.pendingWithdrawals} withdrawals pending review
                </p>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  {stats.pendingTopups} topup requests waiting
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;