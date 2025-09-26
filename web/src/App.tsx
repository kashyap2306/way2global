import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserDetails from './pages/UserDetails';
import HomePage from './pages/dashboard/HomePage';
import ReferralsPage from './pages/dashboard/ReferralsPage';
import TopupPage from './pages/dashboard/TopupPage';
import LevelIncomePage from './pages/dashboard/LevelIncomePage';
import GlobalIncomePage from './pages/dashboard/GlobalIncomePage';
import WalletPage from './pages/dashboard/WalletPage';
import WithdrawalPage from './pages/dashboard/WithdrawalPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import './App.css';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/dashboard/home" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={currentUser ? <Navigate to="/dashboard/home" replace /> : <Signup />} 
      />
      <Route 
        path="/user-details" 
        element={
          <ProtectedRoute>
            <UserDetails />
          </ProtectedRoute>
        } 
      />
      
      {/* Dashboard Routes */}
      <Route 
        path="/dashboard/home" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <HomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/referrals" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ReferralsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/topup" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TopupPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/level-income" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <LevelIncomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/global-income" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <GlobalIncomePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/wallet" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WalletPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/withdrawal" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WithdrawalPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/profile" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Legacy Dashboard Route */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Root Route */}
      <Route 
        path="/" 
        element={<Navigate to={currentUser ? "/dashboard/home" : "/login"} replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
