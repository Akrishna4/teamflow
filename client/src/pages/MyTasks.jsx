import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { EVENTS } from '../constants/socketEvents';
import { Search, AlertCircle, CheckCircle2, Clock, Inbox, Calendar } from 'lucide-react';
import { moveTaskBetweenGroups } from '../utils/dashboardState';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function MyTasks() {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('assigned');
  
  // Dashboard state matches the API response
  const [dashboard, setDashboard] = useState({
    summary: { assigned: 0, pending: 0, overdue: 0, completed: 0 },
    groups: { assigned: [], pending: [], overdue: [], completed: [] },
    hasMore: { assigned: false, pending: false, overdue: false, completed: false }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOption, setSortOption] = useState('Newest');
  
  // Modal State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/tasks/my/dashboard', {
        params: {
          search: debouncedSearch,
          sort: sortOption,
          limit: 50, // For now, just fetch up to 50 per category
        }
      });
      setDashboard(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
      setError('Unable to load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortOption]);

  const fetchDependencies = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/projects'),
      ]);
      setUsers(usersRes.data.users);
      setProjects(projectsRes.data.projects);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
      fetchDependencies();
    }
  }, [user, fetchDashboard]);

  // Socket Logic
  useEffect(() => {
    if (!socket || !user) return;

    let timeoutId;
    const handleTaskEvent = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchDashboard();
      }, 500);
    };

    socket.on(EVENTS.TASK_CREATED, handleTaskEvent);
    socket.on(EVENTS.TASK_UPDATED, handleTaskEvent);
    socket.on(EVENTS.TASK_DELETED, handleTaskEvent);
    socket.on('connect', handleTaskEvent); // Handle reconnects

    return () => {
      clearTimeout(timeoutId);
      socket.off(EVENTS.TASK_CREATED, handleTaskEvent);
      socket.off(EVENTS.TASK_UPDATED, handleTaskEvent);
      socket.off(EVENTS.TASK_DELETED, handleTaskEvent);
      socket.off('connect', handleTaskEvent);
    };
  }, [socket, user, fetchDashboard]);

  const handleUpdateTask = (taskId, updateData) => {
    // The actual API call was already made by TaskDetailsModal (PUT /tasks/:id/status).
    // The socket TASK_UPDATED event will trigger a full fetchDashboard() as backstop.
    // Here we apply an immediate optimistic update so the UI moves instantly.
    if (!updateData.status) return;
    setDashboard(prev => moveTaskBetweenGroups(prev, taskId, updateData.status));
  };

  const selectedTask = React.useMemo(() => {
    if (!selectedTaskId) return null;
    // Search ALL groups so the modal stays open after a task moves columns.
    for (const tasks of Object.values(dashboard.groups)) {
      const found = tasks.find(t => t._id === selectedTaskId);
      if (found) return found;
    }
    return null;
  }, [selectedTaskId, dashboard.groups]);

  const renderTaskCard = (task) => {
    return (
      <div 
        key={task._id}
        onClick={() => setSelectedTaskId(task._id)}
        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 items-center">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {task.priority}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
              {task.project?.name || 'No Project'}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
          {task.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className={activeTab === 'overdue' ? 'text-rose-600 font-semibold' : ''}>
                {formatDate(task.dueDate)}
              </span>
            </div>
          )}
          
          {task.estimatedEffort > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{task.estimatedEffort}h</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getEmptyState = (tab) => {
    const states = {
      assigned: { icon: Inbox, text: "You have no assigned To Do tasks." },
      pending: { icon: Clock, text: "You have no tasks in progress." },
      overdue: { icon: AlertCircle, text: "Great job! You have no overdue tasks." },
      completed: { icon: CheckCircle2, text: "You haven't completed any tasks yet." }
    };
    const { icon: Icon, text } = states[tab];
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 border-dashed rounded-2xl">
        <Icon className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-1">No tasks found</h3>
        <p className="text-slate-500">{text}</p>
      </div>
    );
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-500 mt-1">Manage and track your assigned work.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm transition-all"
            />
          </div>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
            <option value="Priority">Highest Priority</option>
            <option value="Due Date">Due Date</option>
            <option value="Alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { id: 'assigned', label: 'Assigned', count: dashboard.summary.assigned, color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200' },
          { id: 'pending', label: 'In Progress', count: dashboard.summary.pending, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
          { id: 'overdue', label: 'Overdue', count: dashboard.summary.overdue, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          { id: 'completed', label: 'Completed', count: dashboard.summary.completed, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(card => (
          <div 
            key={card.id}
            onClick={() => setActiveTab(card.id)}
            className={`p-5 rounded-2xl border ${card.border} ${activeTab === card.id ? card.bg : 'bg-white hover:bg-slate-50'} cursor-pointer transition-all duration-200`}
          >
            <p className="text-sm font-semibold text-slate-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-black ${activeTab === card.id ? card.color : 'text-slate-900'}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 mb-8 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6" role="tablist" aria-label="Task categories">
        {[
          { id: 'assigned', label: 'Assigned' },
          { id: 'pending', label: 'Pending' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {loading && !dashboard.groups[activeTab].length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : dashboard.groups[activeTab].length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboard.groups[activeTab].map(renderTaskCard)}
          </div>
        ) : (
          getEmptyState(activeTab)
        )}
      </div>

      {dashboard.hasMore[activeTab] && (
        <div className="mt-8 text-center">
          <button className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            Load More
          </button>
        </div>
      )}

      <TaskDetailsModal
        task={selectedTask}
        users={users}
        projects={projects}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={handleUpdateTask}
        onDuplicate={() => {}} // Not typically needed for MyTasks, but provided for prop safety
        onDeleteRequest={() => {}} // Users shouldn't typically delete tasks from MyTasks unless Admin
      />
    </Layout>
  );
}
