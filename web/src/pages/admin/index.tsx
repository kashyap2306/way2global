import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  BanknotesIcon,
  CreditCardIcon,
  TicketIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const AdminLayout: React.FC = () => {
  const { logout, userData } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HomeIcon,
      current: location.pathname === '/admin',
      badge: null
    },
    {
      name: 'Users Management',
      href: '/admin/users',
      icon: UsersIcon,
      current: location.pathname === '/admin/users',
      badge: null
    },
    {
      name: 'Withdrawals',
      href: '/admin/withdrawals',
      icon: BanknotesIcon,
      current: location.pathname === '/admin/withdrawals',
      badge: '3' // Example pending count
    },
    {
      name: 'Topup Requests',
      href: '/admin/topups',
      icon: CreditCardIcon,
      current: location.pathname === '/admin/topups',
      badge: '5' // Example pending count
    },
    {
      name: 'Fund Requests',
      href: '/admin/fund-requests',
      icon: CreditCardIcon,
      current: location.pathname === '/admin/fund-requests',
      badge: null
    },
    {
      name: 'Support Tickets',
      href: '/admin/support',
      icon: TicketIcon,
      current: location.pathname === '/admin/support',
      badge: '2' // Example pending count
    },
    {
      name: 'Global Income',
      href: '/admin/global-income',
      icon: ChartBarIcon,
      current: location.pathname === '/admin/global-income',
      badge: null
    },
    {
      name: 'Platform Settings',
      href: '/admin/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/admin/settings',
      badge: null
    },
    {
      name: 'Manage Topups (Old)',
      href: '/admin/manage-topups',
      icon: ChartBarIcon,
      current: location.pathname === '/admin/manage-topups',
      badge: null
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getPageTitle = () => {
    const currentItem = navigationItems.find(item => item.current);
    return currentItem?.name || 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
          <div className="flex flex-col flex-grow bg-black/20 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
            {/* Logo/Brand Section */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <div>
                  <h1 className="text-white font-bold text-xl">WayGlobe</h1>
                  <p className="text-purple-300 text-sm font-medium">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Admin Info Section */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {userData?.displayName || 'Admin User'}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {userData?.role || 'admin'} • {userData?.status || 'active'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      item.current
                        ? 'bg-gradient-to-r from-purple-600/50 to-pink-600/50 text-white border border-purple-500/50 shadow-lg'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white hover:scale-105'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all duration-200 group"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-sm border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">W</span>
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-xl">WayGlobe</h1>
                    <p className="text-purple-300 text-sm font-medium">Admin Panel</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Mobile Admin Info */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {userData?.displayName || 'Admin User'}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {userData?.role || 'admin'} • {userData?.status || 'active'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      item.current
                        ? 'bg-gradient-to-r from-purple-600/50 to-pink-600/50 text-white border border-purple-500/50 shadow-lg'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Logout */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all duration-200 group"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:pl-64">
          {/* Enhanced Top Bar */}
          <div className="bg-black/10 backdrop-blur-sm border-b border-white/10 px-4 py-4 lg:px-8 sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-300 hover:text-white lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {getPageTitle()}
                  </h2>
                  <p className="text-gray-300 text-sm hidden sm:block">
                    Manage your platform efficiently
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search Button (Mobile) */}
                <button className="lg:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
                
                {/* User Info & Logout */}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-white">
                      {userData?.displayName || userData?.email || 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {userData?.role || 'admin'} • Online
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900/50 via-purple-900/30 to-violet-900/50">
            <div className="p-4 lg:p-8 max-w-full">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;