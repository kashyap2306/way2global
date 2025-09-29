import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getAllTickets, 
  updateTicketStatus,
  assignTicket,
  addTicketResponse
} from '../../services/firestoreService';
import { 
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

// Define interfaces locally to avoid import issues
interface TicketResponse {
  senderId: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Timestamp;
}

interface SupportTicket {
  id?: string;
  userId: string;
  userCode: string;
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'normal' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo: string | null;
  response: TicketResponse[];
}

const AdminTicketsPage: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [responding, setResponding] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Response form
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, priorityFilter, searchTerm, sortBy, sortOrder]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const allTickets = await getAllTickets();
      setTickets(allTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(term) ||
        ticket.userCode.toLowerCase().includes(term) ||
        ticket.description.toLowerCase().includes(term)
      );
    }

    // Sort tickets
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'urgent': 3, 'high': 2, 'normal': 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = { 'pending': 4, 'in-progress': 3, 'resolved': 2, 'closed': 1 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'createdAt':
          aValue = a.createdAt?.toDate?.()?.getTime() || 0;
          bValue = b.createdAt?.toDate?.()?.getTime() || 0;
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

    setFilteredTickets(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: 'pending' | 'in-progress' | 'resolved' | 'closed') => {
    try {
      setUpdating(true);
      await updateTicketStatus(ticketId, newStatus);
      toast.success('Ticket status updated successfully');
      fetchTickets();
      
      // Update selected ticket if it's the one being updated
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignTicket = async (ticketId: string) => {
    if (!user) return;
    
    try {
      setUpdating(true);
      await assignTicket(ticketId, user.uid);
      toast.success('Ticket assigned successfully');
      fetchTickets();
      
      // Update selected ticket if it's the one being assigned
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ 
          ...selectedTicket, 
          assignedTo: user.uid,
          status: 'in-progress'
        });
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddResponse = async () => {
    if (!user || !selectedTicket || !responseMessage.trim()) return;

    try {
      setResponding(true);
      await addTicketResponse(
        selectedTicket.id!,
        user.uid,
        'admin',
        responseMessage
      );
      
      toast.success('Response added successfully');
      setResponseMessage('');
      
      // Refresh the selected ticket to show new response
      const updatedTickets = await getAllTickets();
      const updatedTicket = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
      setTickets(updatedTickets);
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Failed to add response');
    } finally {
      setResponding(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ExclamationCircleIcon className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            <XMarkIcon className="w-3 h-3 mr-1" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            Unknown
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <FireIcon className="w-3 h-3 mr-1" />
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            Unknown
          </span>
        );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
    setResponseMessage('');
  };

  // Pagination calculations
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

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
          <p className="text-gray-300">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Support Tickets Management</h1>
          <p className="text-gray-300">Manage and respond to user support requests</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={fetchTickets}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Pending</p>
              <p className="text-lg font-semibold text-white">
                {tickets.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">In Progress</p>
              <p className="text-lg font-semibold text-white">
                {tickets.filter(t => t.status === 'in-progress').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Resolved</p>
              <p className="text-lg font-semibold text-white">
                {tickets.filter(t => t.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <FireIcon className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">Urgent</p>
              <p className="text-lg font-semibold text-white">
                {tickets.filter(t => t.priority === 'urgent').length}
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
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <ExclamationTriangleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-300">
            <span className="bg-purple-500/20 px-3 py-2 rounded-lg border border-purple-500/30">
              {filteredTickets.length} of {tickets.length} tickets
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
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User Code
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
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority</span>
                    {sortBy === 'priority' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Assigned To
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Created</span>
                    {sortBy === 'createdAt' && (
                      <span className="text-purple-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentTickets.map((ticket) => (
                <tr key={ticket.id} className={`hover:bg-white/5 transition-colors ${ticket.priority === 'urgent' ? 'bg-red-500/5 border-l-4 border-red-500' : ticket.priority === 'high' ? 'bg-orange-500/5 border-l-4 border-orange-500' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{ticket.subject}</div>
                    <div className="text-sm text-gray-400 truncate max-w-xs">
                      {ticket.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {ticket.userCode}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4">
                    {getPriorityBadge(ticket.priority)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {ticket.assignedTo ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="h-4 w-4 text-green-400" />
                        <span className="text-green-400">Assigned</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openTicketModal(ticket)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                      >
                        View
                      </button>
                      {!ticket.assignedTo && (
                        <button
                          onClick={() => handleAssignTicket(ticket.id!)}
                          disabled={updating}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {currentTickets.map((ticket) => (
          <div key={ticket.id} className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 ${ticket.priority === 'urgent' ? 'border-l-4 border-red-500' : ticket.priority === 'high' ? 'border-l-4 border-orange-500' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-white font-medium text-sm">{ticket.subject}</h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{ticket.description}</p>
              </div>
              <div className="ml-3 flex flex-col space-y-2">
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-400">User Code:</span>
                <p className="text-white">{ticket.userCode}</p>
              </div>
              <div>
                <span className="text-gray-400">Assignment:</span>
                <div className="mt-1">
                  {ticket.assignedTo ? (
                    <div className="flex items-center space-x-1">
                      <CheckCircleIcon className="h-3 w-3 text-green-400" />
                      <span className="text-green-400 text-xs">Assigned</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Unassigned</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Created:</span>
                <div className="flex items-center space-x-1 mt-1">
                  <CalendarIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-white text-xs">{formatDate(ticket.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => openTicketModal(ticket)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
              >
                View Details
              </button>
              {!ticket.assignedTo && (
                <button
                  onClick={() => handleAssignTicket(ticket.id!)}
                  disabled={updating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Assign
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tickets found</h3>
          <p className="text-gray-300">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No support tickets have been created yet'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, filteredTickets.length)} of {filteredTickets.length} tickets
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

      {/* Ticket Details Modal */}
      {isTicketModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <span className="text-sm text-gray-300">User: {selectedTicket.userCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ticket Details */}
              <div className="lg:col-span-2">
                <div className="border-t border-white/10 pt-4">
                  <h3 className="font-medium text-white mb-2">Description</h3>
                  <p className="text-gray-300 mb-4">{selectedTicket.description}</p>
                  
                  <div className="text-sm text-gray-400 mb-6">
                    Created: {formatDate(selectedTicket.createdAt)} | 
                    Updated: {formatDate(selectedTicket.updatedAt)}
                  </div>
                  
                  {selectedTicket.response && selectedTicket.response.length > 0 && (
                    <div>
                      <h3 className="font-medium text-white mb-3">Conversation ({selectedTicket.response.length})</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {selectedTicket.response.map((response, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${response.senderRole === 'admin' ? 'bg-blue-500/10 border-blue-500/30 ml-4' : 'bg-black/20 border-white/10 mr-4'}`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-white">
                                {response.senderRole === 'admin' ? 'Support Team' : 'User'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(response.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-300">{response.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Panel */}
              <div className="space-y-4">
                {/* Status Update */}
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-3">Update Status</h3>
                  <div className="space-y-2">
                    {['pending', 'in-progress', 'resolved', 'closed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(selectedTicket.id!, status as any)}
                        disabled={updating || selectedTicket.status === status}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedTicket.status === status
                            ? 'bg-purple-600 text-white cursor-not-allowed'
                            : 'bg-black/20 hover:bg-black/30 text-gray-300 border border-white/10'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment */}
                {!selectedTicket.assignedTo && (
                  <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                    <button
                      onClick={() => handleAssignTicket(selectedTicket.id!)}
                      disabled={updating}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      {updating ? 'Assigning...' : 'Assign to Me'}
                    </button>
                  </div>
                )}

                {/* Add Response */}
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <h3 className="font-medium text-white mb-3">Add Response</h3>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Type your response..."
                  />
                  <button
                    onClick={handleAddResponse}
                    disabled={responding || !responseMessage.trim()}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span>{responding ? 'Sending...' : 'Send Response'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTicketsPage;

// Define interfaces locally to avoid import issues
interface TicketResponse {
  senderId: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Timestamp;
}

interface SupportTicket {
  id?: string;
  userId: string;
  userCode: string;
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'normal' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo: string | null;
  response: TicketResponse[];
}