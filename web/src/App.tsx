import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Signup from './pages/Signup';
import Login from './pages/Login';
import UserDetails from './pages/UserDetails';
import HomePage from './pages/HomePage';
import ReferralsPage from './pages/ReferralsPage';
import TopupPage from './pages/TopupPage';
import LevelIncomePage from './pages/LevelIncomePage';
import GlobalIncomePage from './pages/GlobalIncomePage';
import AdminTopUpRequests from './components/AdminTopUpRequests';
import AdminWithdrawalPanel from './components/admin/AdminWithdrawalPanel';
import MyTicketsPage from './pages/MyTicketsPage';
import AdminTicketsPage from './pages/AdminTicketsPage';

import WalletPage from './pages/WalletPage';
import WithdrawalPage from './pages/WithdrawalPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();

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
        path="/user-details" 
        element={
          <ProtectedRoute>
            <UserDetails />
          </ProtectedRoute>
        } 
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
      
      {/* Admin Routes */}
      <Route 
        path="/admin/tickets" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AdminTicketsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/topup-requests" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AdminTopUpRequests />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/withdrawals" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AdminWithdrawalPanel />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Root Route */}
      <Route 
        path="/" 
        element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} 
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
