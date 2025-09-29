import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  UsersIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon
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
      change: '+12%',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      change: '+8%',
      changeType: 'increase',
      icon: CheckCircleIcon,
      color: 'from-green-500 to-green-600',
      link: '/admin/users'
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      change: '+3',
      changeType: 'increase',
      icon: ClockIcon,
      color: 'from-yellow-500 to-yellow-600',
      link: '/admin/withdrawals'
    },
    {
      title: 'Total Withdrawal Amount',
      value: `$${stats.totalWithdrawalAmount.toLocaleString()}`,
      change: '+15%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/withdrawals'
    },
    {
      title: 'Pending Topups',
      value: stats.pendingTopups,
      change: '-2',
      changeType: 'decrease',
      icon: DocumentTextIcon,
      color: 'from-orange-500 to-orange-600',
      link: '/admin/topups'
    },
    {
      title: 'Income Distributed',
      value: `$${stats.totalIncomeDistributed.toLocaleString()}`,
      change: '+22%',
      changeType: 'increase',
      icon: ChartBarIcon,
      color: 'from-teal-500 to-teal-600',
      link: '/admin/audit'
    }
  ];

  const recentActivity = [
    { id: 1, user: 'John Doe', action: 'Withdrawal Request', amount: '$500', time: '2 minutes ago', status: 'pending' },
    { id: 2, user: 'Jane Smith', action: 'Topup Request', amount: '$200', time: '5 minutes ago', status: 'approved' },
    { id: 3, user: 'Mike Johnson', action: 'Support Ticket', amount: '-', time: '10 minutes ago', status: 'open' },
    { id: 4, user: 'Sarah Wilson', action: 'Account Created', amount: '-', time: '15 minutes ago', status: 'active' },
    { id: 5, user: 'David Brown', action: 'Withdrawal Approved', amount: '$750', time: '20 minutes ago', status: 'completed' }
  ];

  const quickActions = [
    { title: 'Manage Users', description: 'View and manage user accounts', link: '/admin/users', color: 'bg-blue-600 hover:bg-blue-700', icon: UsersIcon },
    { title: 'Review Withdrawals', description: 'Process pending withdrawals', link: '/admin/withdrawals', color: 'bg-green-600 hover:bg-green-700', icon: CurrencyDollarIcon },
    { title: 'Approve Topups', description: 'Handle topup requests', link: '/admin/topups', color: 'bg-purple-600 hover:bg-purple-700', icon: DocumentTextIcon },
    { title: 'Support Tickets', description: 'Manage customer support', link: '/admin/support', color: 'bg-orange-600 hover:bg-orange-700', icon: ExclamationTriangleIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-300">Welcome back, {userData?.displayName || 'Admin'}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={fetchDashboardStats}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link
              key={index}
              to={card.link}
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-black/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <EyeIcon className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">{card.title}</p>
                <p className="text-lg font-bold text-white mb-2">{card.value}</p>
                <div className="flex items-center text-xs">
                  {card.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-400 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-400 mr-1" />
                  )}
                  <span className={card.changeType === 'increase' ? 'text-green-400' : 'text-red-400'}>
                    {card.change}
                  </span>
                  <span className="text-gray-400 ml-1">this month</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link to="/admin/audit" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View all
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{activity.user}</p>
                    <p className="text-xs text-gray-400">{activity.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{activity.amount}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      activity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      activity.status === 'approved' || activity.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                      activity.status === 'active' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-orange-500/20 text-orange-300'
                    }`}>
                      {activity.status}
                    </span>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className={`flex items-center p-3 ${action.color} text-white rounded-lg transition-colors group`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <div>
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs opacity-80">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* System Status & Alerts */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Database</span>
                <span className="text-green-400 flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Payment Gateway</span>
                <span className="text-green-400 flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Email Service</span>
                <span className="text-green-400 flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
            </div>

            {/* Alerts */}
            <div className="mt-6 space-y-3">
              <h4 className="text-white font-medium text-sm">Alerts</h4>
              {stats.pendingWithdrawals > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs">
                    {stats.pendingWithdrawals} withdrawals pending review
                  </p>
                </div>
              )}
              {stats.pendingTopups > 0 && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-xs">
                    {stats.pendingTopups} topup requests waiting
                  </p>
                </div>
              )}
              {stats.suspendedUsers > 0 && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-300 text-xs">
                    {stats.suspendedUsers} users suspended
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;