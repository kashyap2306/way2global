import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Globe, 
  Wallet, 
  ArrowDownToLine, 
  User, 
  LogOut,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Headphones
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route?: string;
  isLogout?: boolean;
  adminOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, userData } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      route: '/dashboard',
    },
    {
      id: 'referrals',
      label: 'Referrals & Team',
      icon: <Users className="h-5 w-5" />,
      route: '/referrals',
    },
    {
      id: 'topup',
      label: 'Topup',
      icon: <CreditCard className="h-5 w-5" />,
      route: '/topup',
    },
    {
      id: 'level-income',
      label: 'Level Income',
      icon: <TrendingUp className="h-5 w-5" />,
      route: '/level-income',
    },
    {
      id: 'global-income',
      label: 'Global Income',
      icon: <Globe className="h-5 w-5" />,
      route: '/global-income',
    },
    {
      id: 'wallet',
      label: 'Wallet Balance',
      icon: <Wallet className="h-5 w-5" />,
      route: '/wallet',
    },
    {
      id: 'withdrawal',
      label: 'Withdrawal',
      icon: <ArrowDownToLine className="h-5 w-5" />,
      route: '/withdrawal',
    },
    {
      id: 'profile',
      label: 'Profile Management',
      icon: <User className="h-5 w-5" />,
      route: '/profile',
    },
    {
      id: 'my-tickets',
      label: 'Support',
      icon: <MessageSquare className="h-5 w-5" />,
      route: '/support',
    },
    {
      id: 'admin-tickets',
      label: 'Support Tickets',
      icon: <Headphones className="h-5 w-5" />,
      route: '/admin/tickets',
      adminOnly: true,
    },
    {
      id: 'admin-topup',
      label: 'Manage Topups',
      icon: <Settings className="h-5 w-5" />,
      route: '/admin/topup-requests',
      adminOnly: true,
    },
    {
      id: 'admin-withdrawals',
      label: 'Manage Withdrawals',
      icon: <ArrowDownToLine className="h-5 w-5" />,
      route: '/admin/withdrawals',
      adminOnly: true,
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: <LogOut className="h-5 w-5" />,
      isLogout: true,
    },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.isLogout) {
      auth.signOut();
    }
    onClose(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold text-white">Way2Globe</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems
              .filter(item => !item.adminOnly || userData?.role === 'admin')
              .map((item) => (
              <div key={item.id}>
                {item.isLogout ? (
                  <button
                    onClick={() => handleMenuClick(item)}
                    className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 text-slate-300 hover:bg-red-600/20 hover:text-red-400 border-t border-slate-700/50 mt-4 pt-4"
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ) : (
                  <NavLink
                    to={item.route!}
                    onClick={() => handleMenuClick(item)}
                    className={({ isActive }) => `
                      w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200
                      ${isActive
                        ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }
                    `}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 text-center">
              © 2024 Way2Globe
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;