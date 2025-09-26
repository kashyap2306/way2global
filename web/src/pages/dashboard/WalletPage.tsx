import React from 'react';
import { Wallet } from 'lucide-react';

const WalletPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Wallet className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Wallet Balance</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Your Wallet</h2>
        <p className="text-gray-600 mb-4">
          View your wallet balance, transaction history, and manage your funds.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Available Balance</h3>
            <p className="text-sm text-gray-600">View your current available wallet balance.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Transaction History</h3>
            <p className="text-sm text-gray-600">Review all your wallet transactions and activities.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Pending Transactions</h3>
            <p className="text-sm text-gray-600">Check status of pending wallet transactions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;