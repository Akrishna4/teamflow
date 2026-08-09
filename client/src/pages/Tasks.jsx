import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { Plus, X, Calendar } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { EVENTS } from '../constants/socketEvents';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isOverdue = (dateStr, status) => {
  if (!dateStr || status === 'Done') return false;
  return new Date(dateStr) < new Date();
};

export default function Tasks() {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project: '',
    assignedTo: [],
    status: 'To Do',
    priority: 'Medium',
    dueDate: '',
  });

  const fetchTasks = async () => {
    const endpoint = user?.role === 'Admin' ? '/tasks' : '/tasks/my-tasks';
    const res = await axios.get(endpoint);
    return res.data.tasks;
  };

  const fetchAllData = async () => {
    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        fetchTasks(),
        axios.get('/users'),
        axios.get('/projects'),
      ]);

      setTasks(tasksRes);
      setUsers(usersRes.data.users);
      setProjects(projectsRes.data.projects);

      if (projectsRes.data.projects.length > 0) {
        setNewTask((prev) => ({
          ...prev,
          project: projectsRes.data.projects[0]._id,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  // Socket Logic
  useEffect(() => {
    if (!socket || projects.length === 0) return;

    // Join all project rooms so we get real-time task updates
    projects.forEach(p => socket.emit('join-project', p._id));

    const handleTaskCreated = (task) => {
      // If we are a member, only add it if we are assigned
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await axios.post('/tasks', {
        ...newTask,
        dueDate: newTask.dueDate || undefined,
      });
      // The socket event will append the task to the list automatically
      setIsModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        project: projects.length > 0 ? projects[0]._id : '',
        assignedTo: [],
        status: 'To Do',
        priority: 'Medium',
        dueDate: '',
      });
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map((e) => e.message).join(' '));
      } else {
        setError(err.response?.data?.message || 'Failed to create task.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const originalTasks = [...tasks];
    // Optimistic UI
    const optimisticData = { ...updateData };
    if (updateData.project) {
      const p = projects.find(proj => proj._id === updateData.project);
      if (p) optimisticData.project = { _id: p._id, name: p.name };
    }

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
      // Socket injects it
    } catch (err) {
      console.error('Failed to duplicate task', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    const originalTasks = [...tasks];

    // Optimistic Delete
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

  const toggleAssigneeSelection = (userId) => {
    setNewTask((prev) => {
      const assignedTo = prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId];
      return { ...prev, assignedTo };
    });
  };

  if (loading) return <Layout><div className="text-slate-500">Loading tasks...</div></Layout>;

  const selectedTask = selectedTaskId ? tasks.find(t => t._id === selectedTaskId) : null;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.role === 'Admin' ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="text-slate-500 mt-1">
            {user?.role === 'Admin'
              ? 'View and manage all tasks across projects'
              : 'Tasks assigned to you across all projects'}
          </p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </button>
        )}
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Task
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Project
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Priority
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Assignee
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {tasks.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                  <tr
                    key={task._id}
                    onClick={() => setSelectedTaskId(task._id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">
                        {task.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {task.project?.name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
                          task.status === 'Done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
                          task.priority === 'High'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : task.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium flex items-center gap-1.5 ${
                          overdue ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {task.dueDate && (
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        {formatDate(task.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {task.assignedTo && task.assignedTo.length > 0
                        ? task.assignedTo.length === 1
                          ? task.assignedTo[0].name
                          : `${task.assignedTo[0].name} +${task.assignedTo.length - 1}`
                        : 'Unassigned'}
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {user?.role === 'Admin'
                      ? 'No tasks found. Create your first task.'
                      : 'No tasks assigned to you yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Task Modal */}
      {isModalOpen && user?.role === 'Admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Create New Task</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="p-6 space-y-5 overflow-y-auto"
            >
              {error && (
                <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg border border-rose-100">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Update Landing Page"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows="3"
                  placeholder="Add more details..."
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Project */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={projects.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    value={newTask.project}
                    onChange={(e) =>
                      setNewTask({ ...newTask, project: e.target.value })
                    }
                  >
                    {projects.length === 0 ? (
                      <option value="">No projects — create one first</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Select a project
                        </option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newTask.status}
                    onChange={(e) =>
                      setNewTask({ ...newTask, status: e.target.value })
                    }
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Assign To */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Assign To
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      No users found
                    </div>
                  ) : (
                    users.map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center p-3 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                          checked={newTask.assignedTo.includes(u._id)}
                          onChange={() => toggleAssigneeSelection(u._id)}
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-medium text-slate-900">
                            {u.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {u.role}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Selected: {newTask.assignedTo.length} users
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTask.project}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </Layout>
  );
}
