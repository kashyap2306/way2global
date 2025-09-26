import React from 'react';
import { Home } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Home className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Home</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Welcome to Way2Globe</h2>
        <p className="text-gray-600 mb-4">
          This is your dashboard home page. Here you can view an overview of your account and activities.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Quick Stats</h3>
            <p className="text-sm text-gray-600">View your account statistics and performance metrics.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Recent Activity</h3>
            <p className="text-sm text-gray-600">Check your latest transactions and activities.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Notifications</h3>
            <p className="text-sm text-gray-600">Stay updated with important announcements.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;