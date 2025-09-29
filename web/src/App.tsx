import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Login from './pages/Login';
import UserDetails from './pages/UserDetails';
import HomePage from './pages/HomePage';
import ReferralsPage from './pages/ReferralsPage';
import TopupPage from './pages/TopupPage';
import LevelIncomePage from './pages/LevelIncomePage';
import GlobalIncomePage from './pages/GlobalIncomePage';
import MyTicketsPage from './pages/MyTicketsPage';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import WithdrawalsManagement from './pages/admin/WithdrawalsManagement';
import TopupsManagement from './pages/admin/TopupsManagement';
import AdminSettings from './pages/admin/AdminSettings';
import PlatformSettings from './pages/admin/PlatformSettings';
import AuditLogs from './pages/admin/AuditLogs';
import SupportTickets from './pages/admin/SupportTickets';
import GlobalIncomeManagement from './pages/admin/GlobalIncomeManagement';

import WalletPage from './pages/WalletPage';
import WithdrawalPage from './pages/WithdrawalPage';
import ProfilePage from './pages/ProfilePage';
import TestNewSystem from './pages/TestNewSystem';

import './App.css';

const AppContent: React.FC = () => {
  const { currentUser, userData } = useAuth();

  // Role-based navigation logic
  React.useEffect(() => {
    if (currentUser && userData) {
      const currentPath = window.location.pathname;
      
      // If user is admin and not on admin route, redirect to admin dashboard
      if (userData.role === 'admin' && !currentPath.startsWith('/admin')) {
        window.location.href = '/admin';
      }
      // If user is regular user and on admin route, redirect to dashboard
      else if (userData.role === 'user' && currentPath.startsWith('/admin')) {
        window.location.href = '/dashboard';
      }
    }
  }, [currentUser, userData]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />} 
      />
      <Route 
        path="/user-details/:userId" 
        element={<UserDetails />} 
      />
      
      {/* Dashboard Routes with Layout */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <HomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/referrals" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ReferralsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/topup" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TopupPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/level-income" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <LevelIncomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/global-income" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <GlobalIncomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/wallet" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WalletPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/withdrawal" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WithdrawalPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Test Routes */}
      <Route 
        path="/test-new-system" 
        element={<TestNewSystem />} 
      />
      <Route 
              path="/global-income-redesigned" 
              element={<GlobalIncomePage />}
            />
      
      {/* Support Ticket Routes */}
      <Route 
        path="/support" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MyTicketsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Login Route (unprotected) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Admin Routes (protected) */}
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="withdrawals" element={<WithdrawalsManagement />} />
        <Route path="topups" element={<TopupsManagement />} />
        <Route path="manage-topups" element={<TopupsManagement />} />
        <Route path="support" element={<SupportTickets />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="global-income" element={<GlobalIncomeManagement />} />
        <Route path="settings" element={<PlatformSettings />} />
        <Route path="settings-advanced" element={<AdminSettings />} />
      </Route>
      
      {/* Root Route */}
      <Route 
        path="/" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
