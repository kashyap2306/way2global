import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, isSidebarOpen }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => navigate('/profile');

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 shadow-lg border-b border-slate-700/50 fixed w-full top-0 z-30 backdrop-blur-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {isSidebarOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Logo */}
            <div className="flex items-center ml-4 md:ml-0">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white">Way2Globel</h1>
            </div>
          </div>

          <div className="flex items-center">
            {/* Profile icon */}
            <button
              onClick={handleProfileClick}
              className="flex items-center p-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all duration-200 hover:bg-slate-700/50"
            >
              <span className="sr-only">Go to profile</span>
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm font-medium text-white">
                  {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="ml-2 text-sm font-medium text-white hidden sm:block">
                {currentUser?.displayName || currentUser?.email}
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;