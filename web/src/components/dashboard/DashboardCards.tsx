import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  dashboardService, 
  formatDashboardValue, 
  getDashboardCardColor 
} from '../../services/dashboardService';
import type { DashboardData } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';

interface DashboardCard {
  title: string;
  value: number;
  key: keyof DashboardData;
  icon: string;
  color: string;
}

const DashboardCards: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    topUpIncome: 0,
    reTopupIncome: 0,
    globalIncome: 0,
    reGlobalIncome: 0,
    levelIncome: 0,
    reLevelIncome: 0,
    directReferralCount: 0,
    totalTeamCount: 0,
    walletBalance: 0,
    totalWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Card configuration with modern icons and colors
  const cards: DashboardCard[] = [
    {
      title: 'TopUp Income',
      value: dashboardData.topUpIncome,
      key: 'topUpIncome',
      icon: '💰',
      color: getDashboardCardColor(0)
    },
    {
      title: 'Direct Referral',
      value: dashboardData.directReferralCount,
      key: 'directReferralCount',
      icon: '👥',
      color: getDashboardCardColor(1)
    },
    {
      title: 'Total Team',
      value: dashboardData.totalTeamCount,
      key: 'totalTeamCount',
      icon: '🌐',
      color: getDashboardCardColor(2)
    },
    {
      title: 'Wallet Balance',
      value: dashboardData.walletBalance,
      key: 'walletBalance',
      icon: '💳',
      color: getDashboardCardColor(3)
    },
    {
      title: 'Re-Topup Income',
      value: dashboardData.reTopupIncome,
      key: 'reTopupIncome',
      icon: '🔄',
      color: getDashboardCardColor(4)
    },
    {
      title: 'Global Income',
      value: dashboardData.globalIncome,
      key: 'globalIncome',
      icon: '🌍',
      color: getDashboardCardColor(5)
    },
    {
      title: 'Re-Global Income',
      value: dashboardData.reGlobalIncome,
      key: 'reGlobalIncome',
      icon: '🔁',
      color: getDashboardCardColor(6)
    },
    {
      title: 'Level Income',
      value: dashboardData.levelIncome,
      key: 'levelIncome',
      icon: '📊',
      color: getDashboardCardColor(7)
    },
    {
      title: 'Re-Level Income',
      value: dashboardData.reLevelIncome,
      key: 'reLevelIncome',
      icon: '📈',
      color: getDashboardCardColor(8)
    },
    {
      title: 'Total Withdrawals',
      value: dashboardData.totalWithdrawals,
      key: 'totalWithdrawals',
      icon: '💸',
      color: getDashboardCardColor(9)
    }
  ];

  // Fetch dashboard data with real-time updates
  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initial data
        const data = await dashboardService.fetchDashboardData(user.uid);
        setDashboardData(data);

        // Set up real-time listeners
        const cleanup = dashboardService.setupRealTimeListeners(
          user.uid,
          (updatedData) => {
            setDashboardData(prev => ({ ...prev, ...updatedData }));
          },
          (error) => {
            console.error('Real-time listener error:', error);
            setError('Failed to sync real-time data');
          }
        );

        cleanupRef.current = cleanup;
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [user?.uid]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="bg-gray-800 rounded-xl p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
            <div className="w-16 h-4 bg-gray-700 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-gray-700 rounded mb-2"></div>
          <div className="w-32 h-4 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );

  // Error component
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
        <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
        <p className="text-red-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={`
            bg-gradient-to-br ${card.color} 
            rounded-xl p-6 text-white shadow-lg 
            hover:shadow-xl hover:scale-105 
            transition-all duration-300 ease-in-out
            border border-gray-700/30
            backdrop-blur-sm
          `}
          style={{
            animationDelay: `${index * 100}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl opacity-80">{card.icon}</div>
            <div className="text-right">
              <div className="text-xs opacity-70 uppercase tracking-wide font-medium">
                {card.title}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {card.key === 'directReferralCount' || card.key === 'totalTeamCount' 
                ? card.value.toLocaleString()
                : formatCurrency(card.value)
              }
            </div>
            <div className="text-xs opacity-70">
              Real-time data
            </div>
          </div>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl pointer-events-none"></div>
        </div>
      ))}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardCards;