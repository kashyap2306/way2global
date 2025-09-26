import React from 'react';
import { TrendingUp } from 'lucide-react';

const LevelIncomePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <TrendingUp className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Level Income / Re-Level Income</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Track Your Level Earnings</h2>
        <p className="text-gray-600 mb-4">
          Monitor your level income and re-level income from your network activities.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Total Level Income</h3>
            <p className="text-sm text-gray-600">View your cumulative level income earnings.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Monthly Earnings</h3>
            <p className="text-sm text-gray-600">Track your monthly level income performance.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Re-Level Bonuses</h3>
            <p className="text-sm text-gray-600">Monitor additional re-level income bonuses.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelIncomePage;