import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ActivationPopup from '../ActivationPopup';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { showActivationPopup, setShowActivationPopup } = useAuth();

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Navbar */}
      <Navbar 
        onMenuToggle={handleMenuToggle} 
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex">
        {/* Sidebar - Always visible on desktop */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
        />

        {/* Main content - Adjusted for fixed sidebar */}
        <div className={`flex-1 w-full lg:ml-64 ${showActivationPopup ? 'pointer-events-none blur-sm' : ''}`}>
          <main className="pt-16 w-full">
            <div className="w-full max-w-none px-0 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <ActivationPopup
        isOpen={showActivationPopup}
        onClose={() => setShowActivationPopup(false)}
      />
    </div>
  );
};

export default DashboardLayout;
