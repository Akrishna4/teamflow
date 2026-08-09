import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Toast from '../components/Toast';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { Check, Calendar, AlertCircle } from 'lucide-react';
import { EVENTS } from '../constants/socketEvents';

const formatShortDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const isOverdue = (dateStr, status) => {
  if (!dateStr || status === 'Done') return false;
  return new Date(dateStr) < new Date();
};

function TaskCard({ task, isAdmin, onCardClick, onMarkDone, borderClass }) {
  const overdue = isOverdue(task.dueDate, task.status);
  const dateLabel = formatShortDate(task.dueDate);

  return (
    <div
      onClick={() => onCardClick(task._id)}
      className={`p-4 bg-white rounded-xl border ${borderClass} hover:border-blue-300 transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 relative group`}
    >
      <div className="flex justify-between items-start">
        <p className="font-semibold text-sm text-slate-900 pr-8 leading-snug">
          {task.title}
        </p>
        {isAdmin && task.status !== 'Done' && (
          <button
            onClick={(e) => onMarkDone(e, task._id)}
            className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
            title="Mark as Done"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex justify-between items-end mt-3 gap-2 flex-wrap">
        <p className="text-xs text-slate-500 flex items-center">
          <span className="text-slate-400 mr-1">•</span>
          {task.project?.name || 'No project'}
        </p>

        <div className="flex items-center gap-2">
          {dateLabel && (
            <span
              className={`flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md gap-0.5 ${
                overdue
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}
              title={overdue ? 'Overdue' : 'Due date'}
            >
              {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              {dateLabel}
            </span>
          )}

          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignedTo.slice(0, 3).map((assignee, idx) => (
                <div
                  key={idx}
                  className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] border-2 border-white shadow-sm"
                  title={assignee.name || 'User'}
                >
                  {assignee.name ? assignee.name.charAt(0) : 'U'}
                </div>
              ))}
              {task.assignedTo.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] border-2 border-white shadow-sm">
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const fetchTasks = useCallback(async () => {
    const endpoint = user?.role === 'Admin' ? '/tasks' : '/tasks/my-tasks';
    const res = await axios.get(endpoint);
    return res.data.tasks;
  }, [user]);

  const fetchAllData = useCallback(async () => {
    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        fetchTasks(),
        axios.get('/users'),
        axios.get('/projects'),
      ]);

      setTasks(tasksRes);
      setUsers(usersRes.data.users);
      setProjects(projectsRes.data.projects);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    if (user) fetchAllData();
  }, [user, fetchAllData]);

  // Socket Logic
  useEffect(() => {
    if (!socket || projects.length === 0) return;

    projects.forEach(p => socket.emit('join-project', p._id));

    const handleTaskCreated = (task) => {
      if (user?.role !== 'Admin' && !task.assignedTo.some(u => u._id === user._id || u === user._id)) {
        return;
      }
      setTasks(prev => {
        if (prev.find(t => t._id === task._id)) return prev;
        return [task, ...prev];
      });
    };

    const handleTaskUpdated = (task) => {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
    };

    const handleTaskDeleted = (taskId) => {
      setTasks(prev => prev.filter(t => t._id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    };

    socket.on(EVENTS.TASK_CREATED, handleTaskCreated);
    socket.on(EVENTS.TASK_UPDATED, handleTaskUpdated);
    socket.on(EVENTS.TASK_DELETED, handleTaskDeleted);

    return () => {
      projects.forEach(p => socket.emit('leave-project', p._id));
      socket.off(EVENTS.TASK_CREATED, handleTaskCreated);
      socket.off(EVENTS.TASK_UPDATED, handleTaskUpdated);
      socket.off(EVENTS.TASK_DELETED, handleTaskDeleted);
    };
  }, [socket, projects, user, selectedTaskId]);

  const handleMarkDone = async (e, taskId) => {
    e.stopPropagation();
    try {
      await axios.put(`/tasks/${taskId}/status`);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: 'Done' } : t)));
      setToastMessage('Task marked as completed ✓');
      setShowToast(true);
    } catch (error) {
      console.error('Failed to mark task as done', error);
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const originalTasks = [...tasks];

    const optimisticData = { ...updateData };
    if (updateData.project) {
      const p = projects.find(proj => proj._id === updateData.project);
      if (p) optimisticData.project = { _id: p._id, name: p.name };
    }

    // Apply optimistic update immediately
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...optimisticData } : t));

    // Status-only updates are handled by the modal calling PUT /tasks/:id/status directly.
    // Only call PUT /tasks/:id for full-field edits (Admin-only, from TaskForm).
    if (updateData.status && Object.keys(updateData).length === 1) return;

    try {
      await axios.put(`/tasks/${taskId}`, updateData);
    } catch (err) {
      setTasks(originalTasks);
      console.error('Failed to update task', err);
    }
  };

  const handleDuplicateTask = async (taskId) => {
    try {
      await axios.post(`/tasks/${taskId}/duplicate`);
    } catch (err) {
      console.error('Failed to duplicate task', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    const originalTasks = [...tasks];

    setTasks(prev => prev.filter(t => t._id !== taskToDelete._id));
    if (selectedTaskId === taskToDelete._id) setSelectedTaskId(null);

    try {
      await axios.delete(`/tasks/${taskToDelete._id}`);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      setTasks(originalTasks);
      console.error('Failed to delete task', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  if (loading) return <Layout><div className="text-slate-500">Loading dashboard...</div></Layout>;

  const todoTasks = tasks.filter((t) => t.status === 'To Do');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const doneTasks = tasks.filter((t) => t.status === 'Done');
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'
  );

  const isAdmin = user?.role === 'Admin';
  const selectedTask = selectedTaskId ? tasks.find(t => t._id === selectedTaskId) : null;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          {isAdmin ? 'Overview of all tasks across every project' : 'Overview of your assigned tasks'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Tasks</span>
          <span className="text-3xl font-bold text-slate-900">{tasks.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending</span>
          <span className="text-3xl font-bold text-blue-600">{todoTasks.length + inProgressTasks.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</span>
          <span className="text-3xl font-bold text-emerald-600">{doneTasks.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Overdue</span>
          <span className="text-3xl font-bold text-red-500">{overdueTasks.length}</span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-2" />
              To Do
            </h3>
            <span className="bg-white border border-slate-200 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">
              {todoTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {todoTasks.map((task) => (
              <TaskCard key={task._id} task={task} isAdmin={isAdmin} onCardClick={setSelectedTaskId} onMarkDone={handleMarkDone} borderClass="border-slate-200" />
            ))}
            {todoTasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tasks</p>}
          </div>
        </div>

        <div className="glass-panel p-6 bg-blue-50/30 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 animate-pulse" />
              In Progress
            </h3>
            <span className="bg-white border border-blue-200 text-blue-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">
              {inProgressTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskCard key={task._id} task={task} isAdmin={isAdmin} onCardClick={setSelectedTaskId} onMarkDone={handleMarkDone} borderClass="border-blue-200" />
            ))}
            {inProgressTasks.length === 0 && <p className="text-sm text-blue-400/70 text-center py-4">No tasks</p>}
          </div>
        </div>

        <div className="glass-panel p-6 bg-emerald-50/30 border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
              Done
            </h3>
            <span className="bg-white border border-emerald-200 text-emerald-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">
              {doneTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <div key={task._id} onClick={() => setSelectedTaskId(task._id)} className="p-4 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5">
                <p className="font-semibold text-sm text-slate-400 line-through">{task.title}</p>
                <div className="flex justify-between items-end mt-3">
                  <p className="text-xs text-slate-400 flex items-center">
                    <span className="text-emerald-400 mr-1">•</span>{task.project?.name || 'No project'}
                  </p>
                </div>
              </div>
            ))}
            {doneTasks.length === 0 && <p className="text-sm text-emerald-400/70 text-center py-4">No tasks</p>}
          </div>
        </div>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        users={users}
        projects={projects}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={handleUpdateTask}
        onDuplicate={handleDuplicateTask}
        onDeleteRequest={openDeleteModal}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Task?"
        message={`Are you sure you want to delete "${taskToDelete?.title}"?`}
        isDeleting={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
    </Layout>
  );
}
