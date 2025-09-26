import React from 'react';
import { TrophyIcon, ArrowUpIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface RankProgressProps {
  currentRank: string;
  nextRank?: string;
  nextRankTopUpAmount?: number;
  cyclesCompleted: number;
  cyclesRequired?: number;
  totalEarnings: number;
  nextRankEarningsRequired?: number;
  loading?: boolean;
}

const RankProgress: React.FC<RankProgressProps> = ({
  currentRank,
  nextRank,
  nextRankTopUpAmount = 0,
  cyclesCompleted,
  cyclesRequired = 10,
  totalEarnings,
  nextRankEarningsRequired = 0,
  loading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getRankColor = (rank: string) => {
    const rankColors: { [key: string]: string } = {
      'Bronze': 'text-amber-600 bg-amber-50 border-amber-200',
      'Silver': 'text-gray-600 bg-gray-50 border-gray-200',
      'Gold': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'Platinum': 'text-blue-600 bg-blue-50 border-blue-200',
      'Diamond': 'text-purple-600 bg-purple-50 border-purple-200',
      'Crown': 'text-red-600 bg-red-50 border-red-200',
    };
    return rankColors[rank] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const cycleProgress = Math.min((cyclesCompleted / cyclesRequired) * 100, 100);
  const earningsProgress = nextRankEarningsRequired > 0 
    ? Math.min((totalEarnings / nextRankEarningsRequired) * 100, 100) 
    : 100;

  const cyclesLeft = Math.max(cyclesRequired - cyclesCompleted, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrophyIcon className="w-5 h-5 mr-2 text-yellow-500" />
          Rank Progress
        </h3>
      </div>

      {/* Current Rank */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Rank</span>
        </div>
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getRankColor(currentRank)}`}>
          <TrophyIcon className="w-4 h-4 mr-2" />
          {currentRank}
        </div>
      </div>

      {nextRank && (
        <>
          {/* Next Rank */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Next Rank</span>
              <span className="text-sm text-gray-500">
                {nextRankTopUpAmount > 0 && `Top-up: ${formatCurrency(nextRankTopUpAmount)}`}
              </span>
            </div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getRankColor(nextRank)}`}>
              <ArrowUpIcon className="w-4 h-4 mr-2" />
              {nextRank}
            </div>
          </div>

          {/* Cycles Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Cycles Progress</span>
              <span className="text-sm text-gray-500">
                {cyclesCompleted} / {cyclesRequired} cycles
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${cycleProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{cyclesCompleted} completed</span>
              <span>{cyclesLeft} left</span>
            </div>
          </div>

          {/* Earnings Progress */}
          {nextRankEarningsRequired > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Earnings Progress</span>
                <span className="text-sm text-gray-500">
                  {formatCurrency(totalEarnings)} / {formatCurrency(nextRankEarningsRequired)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${earningsProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{Math.round(earningsProgress)}% complete</span>
                <span>{formatCurrency(Math.max(nextRankEarningsRequired - totalEarnings, 0))} remaining</span>
              </div>
            </div>
          )}

          {/* Requirements Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Requirements for {nextRank}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cycles Required:</span>
                <span className={`font-medium ${cyclesCompleted >= cyclesRequired ? 'text-green-600' : 'text-gray-900'}`}>
                  {cyclesRequired}
                  {cyclesCompleted >= cyclesRequired && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </span>
              </div>
              
              {nextRankTopUpAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Top-up Amount:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(nextRankTopUpAmount)}
                  </span>
                </div>
              )}
              
              {nextRankEarningsRequired > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Earnings Required:</span>
                  <span className={`font-medium ${totalEarnings >= nextRankEarningsRequired ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(nextRankEarningsRequired)}
                    {totalEarnings >= nextRankEarningsRequired && (
                      <span className="ml-1 text-green-600">✓</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          {cyclesCompleted >= cyclesRequired && totalEarnings >= nextRankEarningsRequired && (
            <div className="mt-4">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                Upgrade to {nextRank}
              </button>
            </div>
          )}
        </>
      )}

      {!nextRank && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrophyIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Maximum Rank Achieved!</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Congratulations! You've reached the highest rank available.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankProgress;