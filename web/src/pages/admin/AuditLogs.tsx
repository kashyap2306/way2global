import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  UserIcon, 
  CogIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DocumentTextIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  type: 'user_action' | 'admin_action' | 'system_action';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
  status: 'success' | 'failed' | 'pending';
  metadata?: Record<string, any>;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'type' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filterType, filterStatus, sortBy, sortOrder]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const logsQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(500) // Increased limit for better filtering
      );
      
      const querySnapshot = await getDocs(logsQuery);
      const logsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        log.userEmail?.toLowerCase().includes(term) ||
        log.userName?.toLowerCase().includes(term) ||
        log.ipAddress?.toLowerCase().includes(term)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => log.status === filterStatus);
    }

    // Sort logs
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp?.toDate?.()?.getTime() || 0;
          bValue = b.timestamp?.toDate?.()?.getTime() || 0;
          break;
        case 'action':
          aValue = a.action.toLowerCase();
          bValue = b.action.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          const statusOrder = { 'failed': 3, 'pending': 2, 'success': 1 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getActionIcon = (type: string, status: string) => {
    if (status === 'success') {
      return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
    } else if (status === 'failed') {
      return <XCircleIcon className="h-5 w-5 text-red-400" />;
    } else if (type === 'admin_action') {
      return <CogIcon className="h-5 w-5 text-blue-400" />;
    } else if (type === 'system_action') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
    } else {
      return <UserIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'admin_action':
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'system_action':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'user_action':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const formatTimestamp = (timestamp: Timestamp | string | number | Date) => {
    if (!timestamp) return 'N/A';
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openLogModal = (log: AuditLog) => {
    setSelectedLog(log);
    setIsLogModalOpen(true);
  };

  // Pagination calculations
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-gray-300">Track all system activities and user actions</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={fetchAuditLogs}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ClockIcon className="h-4 w-4 mr-2 inline" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Successful</p>
              <p className="text-lg font-semibold text-white">
                {logs.filter(log => log.status === 'success').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Failed</p>
              <p className="text-lg font-semibold text-white">
                {logs.filter(log => log.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CogIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Admin Actions</p>
              <p className="text-lg font-semibold text-white">
                {logs.filter(log => log.type === 'admin_action').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <UserIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">User Actions</p>
              <p className="text-lg font-semibold text-white">
                {logs.filter(log => log.type === 'user_action').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="admin_action">Admin Actions</option>
              <option value="user_action">User Actions</option>
              <option value="system_action">System Actions</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <CheckCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-300">
            <span className="bg-purple-500/20 px-3 py-2 rounded-lg border border-purple-500/30">
              {filteredLogs.length} of {logs.length} logs
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('action')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Action</span>
                    {sortBy === 'action' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Type</span>
                    {sortBy === 'type' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortBy === 'status' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Timestamp</span>
                    {sortBy === 'timestamp' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getActionIcon(log.type, log.status)}
                        <span className="ml-2 text-sm font-medium text-white">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {log.userName || log.userEmail || 'System'}
                      </div>
                      {log.userEmail && log.userName && (
                        <div className="text-xs text-gray-400">{log.userEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                        {log.type ? log.type.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                      <div className="truncate">{log.details}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openLogModal(log)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                      >
                        <EyeIcon className="h-3 w-3 mr-1 inline" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {currentLogs.map((log) => (
          <div key={log.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getActionIcon(log.type, log.status)}
                  <h3 className="text-white font-medium text-sm">{log.action}</h3>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">{log.details}</p>
              </div>
              <div className="ml-3 flex flex-col space-y-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                  {log.type.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                  {log.status}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-400">User:</span>
                <p className="text-white">{log.userName || log.userEmail || 'System'}</p>
              </div>
              <div>
                <span className="text-gray-400">IP Address:</span>
                <p className="text-white">{log.ipAddress || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Timestamp:</span>
                <div className="flex items-center space-x-1 mt-1">
                  <CalendarIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-white text-xs">{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openLogModal(log)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
            >
              View Full Details
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No audit logs found</h3>
          <p className="text-gray-300">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'No audit logs have been recorded yet'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} logs
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-black/20 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'bg-black/20 border border-white/10 text-gray-300 hover:text-white hover:bg-black/30'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 bg-black/20 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {isLogModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedLog.action}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedLog.type)}`}>
                    {selectedLog.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-2">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white ml-2">{selectedLog.userName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white ml-2">{selectedLog.userEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">User ID:</span>
                      <span className="text-white ml-2">{selectedLog.userId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-2">Technical Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">IP Address:</span>
                      <span className="text-white ml-2">{selectedLog.ipAddress || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Timestamp:</span>
                      <span className="text-white ml-2">{formatTimestamp(selectedLog.timestamp)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Log ID:</span>
                      <span className="text-white ml-2 font-mono text-xs">{selectedLog.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                <h3 className="font-medium text-white mb-2">Action Details</h3>
                <p className="text-gray-300 text-sm">{selectedLog.details}</p>
              </div>

              {selectedLog.userAgent && (
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-2">User Agent</h3>
                  <p className="text-gray-300 text-sm font-mono break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-2">Additional Metadata</h3>
                  <pre className="text-gray-300 text-xs font-mono bg-black/20 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;