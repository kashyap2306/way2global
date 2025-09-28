import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllTickets, 
  updateTicketStatus,
  assignTicket,
  addTicketResponse
} from '../services/firestoreService';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  X, 
  AlertCircle,
  Calendar,
  User,
  MessageSquare,
  UserCheck,
  Send
} from 'lucide-react';
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
  const { currentUser } = useAuth();
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
  
  // Response form
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, priorityFilter, searchTerm]);

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
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
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
    if (!currentUser) return;
    
    try {
      setUpdating(true);
      await assignTicket(ticketId, currentUser.uid);
      toast.success('Ticket assigned successfully');
      fetchTickets();
      
      // Update selected ticket if it's the one being assigned
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ 
          ...selectedTicket, 
          assignedTo: currentUser.uid,
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
    if (!currentUser || !selectedTicket || !responseMessage.trim()) return;

    try {
      setResponding(true);
      await addTicketResponse(
        selectedTicket.id!,
        currentUser.uid,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in-progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-2xl shadow-xl p-6 mb-6 backdrop-blur-sm border border-slate-700/50">
          <h1 className="text-2xl font-bold text-white">Admin Support Dashboard</h1>
          <p className="text-slate-300 mt-1">Manage and respond to user support tickets</p>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-2xl shadow-xl p-6 mb-6 backdrop-blur-sm border border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by subject, user code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-yellow-800 via-yellow-900 to-slate-900 rounded-2xl shadow-xl p-6 backdrop-blur-sm border border-slate-700/50">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-300">Pending</p>
                <p className="text-2xl font-semibold text-white">
                  {tickets.filter(t => t.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 rounded-2xl shadow-xl p-6 backdrop-blur-sm border border-slate-700/50">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-300">In Progress</p>
                <p className="text-2xl font-semibold text-white">
                  {tickets.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-800 via-green-900 to-slate-900 rounded-2xl shadow-xl p-6 backdrop-blur-sm border border-slate-700/50">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-300">Resolved</p>
                <p className="text-2xl font-semibold text-white">
                  {tickets.filter(t => t.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-800 via-red-900 to-slate-900 rounded-2xl shadow-xl p-6 backdrop-blur-sm border border-slate-700/50">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-300">Urgent</p>
                <p className="text-2xl font-semibold text-white">
                  {tickets.filter(t => t.priority === 'urgent').length}
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Tickets List - Responsive Design */}
       <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm border border-slate-700/50">
         {/* Desktop Table View */}
         <div className="hidden lg:block">
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-700">
               <thead className="bg-slate-800/50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Subject
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     User Code
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Status
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Priority
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Assigned To
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Created
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                     Actions
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-slate-900/30 divide-y divide-slate-700">
                 {filteredTickets.map((ticket) => (
                   <tr key={ticket.id} className="hover:bg-slate-800/50">
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm font-medium text-white">{ticket.subject}</div>
                       <div className="text-sm text-slate-300 truncate max-w-xs">
                         {ticket.description}
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                       {ticket.userCode}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         {getStatusIcon(ticket.status)}
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                           {ticket.status}
                         </span>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                         {ticket.priority}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                       {ticket.assignedTo ? (
                         <div className="flex items-center gap-1">
                           <UserCheck className="h-4 w-4 text-green-400" />
                           <span className="text-green-400">Assigned</span>
                         </div>
                       ) : (
                         <span className="text-slate-400">Unassigned</span>
                       )}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                       <div className="flex items-center gap-1">
                         <Calendar className="h-4 w-4" />
                         {formatDate(ticket.createdAt)}
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                       <button
                         onClick={() => openTicketModal(ticket)}
                         className="text-blue-400 hover:text-blue-300 mr-3"
                       >
                         View Details
                       </button>
                       {!ticket.assignedTo && (
                         <button
                           onClick={() => handleAssignTicket(ticket.id!)}
                           disabled={updating}
                           className="text-green-400 hover:text-green-300"
                         >
                           Assign
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-xl p-4 space-y-3 border border-slate-700/50">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-white text-sm">{ticket.subject}</h3>
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 line-clamp-2">{ticket.description}</p>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded-full">
                  User: {ticket.userCode}
                </span>
                <span className={`inline-flex px-2 py-1 font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                {ticket.assignedTo ? (
                  <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Assigned
                  </span>
                ) : (
                  <span className="bg-slate-700/50 text-slate-400 px-2 py-1 rounded-full">
                    Unassigned
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(ticket.createdAt)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openTicketModal(ticket)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View
                  </button>
                  {!ticket.assignedTo && (
                    <button
                      onClick={() => handleAssignTicket(ticket.id!)}
                      disabled={updating}
                      className="text-green-400 hover:text-green-300 text-sm font-medium"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-white">No tickets found</h3>
            <p className="mt-1 text-sm text-slate-300">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No support tickets have been created yet'}
            </p>
          </div>
        )}
      </div>

        {/* Ticket Details Modal */}
        {isTicketModalOpen && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-2xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-700/50">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedTicket.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className="text-sm text-slate-300">User: {selectedTicket.userCode}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsTicketModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket Details */}
                <div className="lg:col-span-2">
                  <div className="border-t border-slate-700/50 pt-4">
                    <h3 className="font-medium text-white mb-2">Description</h3>
                    <p className="text-slate-300 mb-4">{selectedTicket.description}</p>
                    
                    <div className="text-sm text-slate-400 mb-6">
                      Created: {formatDate(selectedTicket.createdAt)} | 
                      Updated: {formatDate(selectedTicket.updatedAt)}
                    </div>
                    
                    {selectedTicket.response && selectedTicket.response.length > 0 && (
                      <div>
                        <h3 className="font-medium text-white mb-3">Conversation ({selectedTicket.response.length})</h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {selectedTicket.response.map((response, index) => (
                            <div key={index} className={`p-3 rounded-lg border ${response.senderRole === 'admin' ? 'bg-blue-900/30 border-blue-700/30 ml-4' : 'bg-slate-800/50 border-slate-700/30 mr-4'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-medium text-white">
                                  {response.senderRole === 'admin' ? 'Support Team' : 'User'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatDate(response.createdAt)}
                                </span>
                              </div>
                              <p className="text-slate-300">{response.message}</p>
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
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                    <h3 className="font-medium text-white mb-3">Update Status</h3>
                    <div className="space-y-2">
                      {['pending', 'in-progress', 'resolved', 'closed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(selectedTicket.id!, status as any)}
                          disabled={updating || selectedTicket.status === status}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedTicket.status === status
                              ? 'bg-blue-600 text-white cursor-not-allowed'
                              : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assignment */}
                  {!selectedTicket.assignedTo && (
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                      <button
                        onClick={() => handleAssignTicket(selectedTicket.id!)}
                        disabled={updating}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        {updating ? 'Assigning...' : 'Assign to Me'}
                      </button>
                    </div>
                  )}

                  {/* Add Response */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                    <h3 className="font-medium text-white mb-3">Add Response</h3>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Type your response..."
                    />
                    <button
                      onClick={handleAddResponse}
                      disabled={responding || !responseMessage.trim()}
                      className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {responding ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTicketsPage;