import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { 
  Home, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Globe, 
  Wallet, 
  ArrowDownToLine, 
  User, 
  LogOut 
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
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      route: '/dashboard/home',
    },
    {
      id: 'referrals',
      label: 'Referrals & Team',
      icon: <Users className="h-5 w-5" />,
      route: '/dashboard/referrals',
    },
    {
      id: 'topup',
      label: 'Topup',
      icon: <CreditCard className="h-5 w-5" />,
      route: '/dashboard/topup',
    },
    {
      id: 'level-income',
      label: 'Level Income / Re-Level Income',
      icon: <TrendingUp className="h-5 w-5" />,
      route: '/dashboard/level-income',
    },
    {
      id: 'global-income',
      label: 'Global Income / Re-Global Income',
      icon: <Globe className="h-5 w-5" />,
      route: '/dashboard/global-income',
    },
    {
      id: 'wallet',
      label: 'Wallet Balance',
      icon: <Wallet className="h-5 w-5" />,
      route: '/dashboard/wallet',
    },
    {
      id: 'withdrawal',
      label: 'Withdrawal',
      icon: <ArrowDownToLine className="h-5 w-5" />,
      route: '/dashboard/withdrawal',
    },
    {
      id: 'profile',
      label: 'Profile Management',
      icon: <User className="h-5 w-5" />,
      route: '/dashboard/profile',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: <LogOut className="h-5 w-5" />,
      isLogout: true,
    },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.isLogout) {
      handleLogout();
    } else if (item.route) {
      navigate(item.route);
      onClose(); // Close mobile sidebar after navigation
    }
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
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">WayGlobe</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`
                  w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200
                  ${window.location.pathname === item.route
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${item.isLogout ? 'mt-auto border-t border-gray-200 pt-4' : ''}
                `}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2024 Way2Globe
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;