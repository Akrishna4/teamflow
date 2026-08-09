import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import FilterPanel from '../components/task/FilterPanel';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { ArrowLeft, Users, Clock, Trash2, X as XIcon, ListFilter } from 'lucide-react';
import { EVENTS } from '../constants/socketEvents';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState(null); // null = unfiltered (use project.tasks)
  const [filterLoading, setFilterLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const DEFAULT_FILTERS = { status: [], priority: [], assignedTo: [], labels: [], dueDate: '', sort: '-createdAt' };
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);

  // Modals State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, usersRes, allProjRes] = await Promise.all([
          axios.get(`/projects/${id}`),
          axios.get('/users'),
          axios.get('/projects')
        ]);
        setProject(projRes.data.project);
        setAllUsers(usersRes.data.users);
        setAllProjects(allProjRes.data.projects);

        // Fetch project labels
        try {
          const labelsRes = await axios.get(`/v1/projects/${id}/labels`);
          setProjectLabels(labelsRes.data.data || []);
        } catch {
          // Labels are optional — fail silently
        }
      } catch (err) {
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Build query string from active filters
  const buildFilterQuery = useCallback((filters) => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.priority?.length) params.set('priority', filters.priority.join(','));
    if (filters.assignedTo?.length) params.set('assignedTo', filters.assignedTo.join(','));
    if (filters.labels?.length) params.set('labels', filters.labels.join(','));
    if (filters.dueDate) params.set('dueDate', filters.dueDate);
    if (filters.sort) params.set('sort', filters.sort);
    return params.toString();
  }, []);

  // Fetch filtered tasks from the backend
  const applyFilters = useCallback(async (filters) => {
    const qs = buildFilterQuery(filters);
    const hasActiveFilters = filters.status?.length || filters.priority?.length ||
      filters.assignedTo?.length || filters.labels?.length || filters.dueDate;

    if (!hasActiveFilters && filters.sort === '-createdAt') {
      setFilteredTasks(null); // revert to project.tasks
      return;
    }

    setFilterLoading(true);
    try {
      const res = await axios.get(`/tasks/project/${id}?${qs}`);
      setFilteredTasks(res.data.tasks);
    } catch (err) {
      console.error('Failed to fetch filtered tasks', err);
    } finally {
      setFilterLoading(false);
    }
  }, [id, buildFilterQuery]);

  useEffect(() => {
    if (!socket || !project) return;

    // Join Project Room
    socket.emit('join-project', id);

    const handleProjectUpdated = (updatedProject) => {
      if (updatedProject._id === id) {
        setProject(updatedProject);
      }
    };

    const handleProjectDeleted = (projectId) => {
      if (projectId === id) {
        navigate('/projects', { replace: true });
      }
    };

    const handleTaskCreated = (newTask) => {
      if (newTask.project === id || newTask.project._id === id) {
        setProject(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      setProject(prev => {
        const tasks = prev.tasks.map(t => t._id === updatedTask._id ? updatedTask : t);
        return { ...prev, tasks };
      });
      // If the currently open task in modal is updated
      if (selectedTaskId === updatedTask._id) {
        // Handled automatically via project.tasks lookup below
      }
    };

    const handleTaskDeleted = (taskId) => {
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t._id !== taskId)
      }));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    };

    socket.on(EVENTS.PROJECT_UPDATED, handleProjectUpdated);
    socket.on(EVENTS.PROJECT_DELETED, handleProjectDeleted);
    socket.on(EVENTS.TASK_CREATED, handleTaskCreated);
    socket.on(EVENTS.TASK_UPDATED, handleTaskUpdated);
    socket.on(EVENTS.TASK_DELETED, handleTaskDeleted);

    return () => {
      socket.emit('leave-project', id);
      socket.off(EVENTS.PROJECT_UPDATED, handleProjectUpdated);
      socket.off(EVENTS.PROJECT_DELETED, handleProjectDeleted);
      socket.off(EVENTS.TASK_CREATED, handleTaskCreated);
      socket.off(EVENTS.TASK_UPDATED, handleTaskUpdated);
      socket.off(EVENTS.TASK_DELETED, handleTaskDeleted);
    };
  }, [socket, id, project, selectedTaskId, navigate]);

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/projects/${id}`);
      // Socket event will trigger redirect, but we can also manually navigate
      navigate('/projects');
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    // Optimistic UI for Task update
    const originalTasks = [...project.tasks];

    const optimisticData = { ...updateData };
    if (updateData.project) {
      const p = allProjects.find(proj => proj._id === updateData.project);
      if (p) optimisticData.project = { _id: p._id, name: p.name };
    }

    setProject(prev => {
      const tasks = prev.tasks.map(t => t._id === taskId ? { ...t, ...optimisticData } : t);
      return { ...prev, tasks };
    });

    // Status-only updates are handled by the modal calling PUT /tasks/:id/status directly.
    // Only call PUT /tasks/:id for full-field edits (Admin-only, from TaskForm).
    if (updateData.status && Object.keys(updateData).length === 1) return;

    try {
      await axios.put(`/tasks/${taskId}`, updateData);
    } catch (err) {
      setProject(prev => ({ ...prev, tasks: originalTasks }));
      console.error('Task update failed', err);
    }
  };

  const handleDuplicateTask = async (taskId) => {
    try {
      await axios.post(`/tasks/${taskId}/duplicate`);
      // Socket event will inject the new task
    } catch (err) {
      console.error('Task duplication failed', err);
    }
  };

  const handleDeleteTask = async (taskToDelete) => {
    // Optimistic Delete
    const originalTasks = [...project.tasks];
    setProject(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t._id !== taskToDelete._id)
    }));
    setSelectedTaskId(null);

    try {
      await axios.delete(`/tasks/${taskToDelete._id}`);
    } catch (err) {
      setProject(prev => ({ ...prev, tasks: originalTasks }));
      console.error('Task deletion failed', err);
    }
  };

  if (loading) return <Layout><div className="text-slate-500">Loading project details...</div></Layout>;
  if (error || !project) return <Layout><div className="text-rose-500">{error || 'Project not found'}</div></Layout>;

  const selectedTask = selectedTaskId ? project.tasks.find(t => t._id === selectedTaskId) : null;

  return (
    <Layout>
      <div className="mb-8">
        <Link to="/projects" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">{project.description || 'No description provided.'}</p>
          </div>
          {user?.role === 'Admin' && (
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center px-4 py-2 bg-white border border-rose-200 text-rose-600 font-medium rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2">
          {/* Task header + Filter */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Project Tasks
              {filteredTasks !== null && (
                <span className="ml-2 text-sm font-medium text-slate-500">({filteredTasks.length} result{filteredTasks.length !== 1 ? 's' : ''})</span>
              )}
            </h2>
            <FilterPanel
              projectId={id}
              activeFilters={activeFilters}
              setActiveFilters={setActiveFilters}
              users={allUsers}
              labels={projectLabels}
              onApply={() => applyFilters(activeFilters)}
            />
          </div>

          {/* Active Filter Chips */}
          {(() => {
            const chips = [];
            if (activeFilters.status?.length) activeFilters.status.forEach(s => chips.push({ key: 'status', value: s, label: `Status: ${s}` }));
            if (activeFilters.priority?.length) activeFilters.priority.forEach(p => chips.push({ key: 'priority', value: p, label: `Priority: ${p}` }));
            if (activeFilters.dueDate) chips.push({ key: 'dueDate', value: '', label: `Due: ${activeFilters.dueDate}` });
            if (activeFilters.assignedTo?.length) activeFilters.assignedTo.forEach(uid => {
              const u = allUsers.find(u => u._id === uid);
              chips.push({ key: 'assignedTo', value: uid, label: `Assignee: ${u?.name || uid}` });
            });
            if (activeFilters.labels?.length) activeFilters.labels.forEach(lid => {
              const l = projectLabels.find(l => l._id === lid);
              chips.push({ key: 'labels', value: lid, label: `Label: ${l?.name || lid}` });
            });

            if (chips.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map((chip, i) => (
                  <span key={`${chip.key}-${chip.value}-${i}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {chip.label}
                    <button
                      onClick={() => {
                        const updated = { ...activeFilters };
                        if (chip.key === 'dueDate') {
                          updated.dueDate = '';
                        } else {
                          updated[chip.key] = updated[chip.key].filter(v => v !== chip.value);
                        }
                        setActiveFilters(updated);
                        applyFilters(updated);
                      }}
                      className="text-blue-600 hover:text-blue-900 ml-1"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    setActiveFilters(DEFAULT_FILTERS);
                    setFilteredTasks(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                >
                  Clear All <XIcon className="w-3 h-3" />
                </button>
              </div>
            );
          })()}

          <div className="glass-panel overflow-hidden">
            {filterLoading ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 text-slate-500">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Applying filters...
                </div>
              </div>
            ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(() => {
                  const displayTasks = filteredTasks !== null ? filteredTasks : (project.tasks || []);
                  if (displayTasks.length === 0) {
                    return (
                      <tr>
                        <td colSpan="3" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <ListFilter className="w-8 h-8" />
                            <p className="text-sm font-medium">
                              {filteredTasks !== null ? 'No tasks match the current filters.' : 'No tasks created for this project yet.'}
                            </p>
                            {filteredTasks !== null && (
                              <button
                                onClick={() => { setActiveFilters(DEFAULT_FILTERS); setFilteredTasks(null); }}
                                className="text-blue-600 text-xs underline mt-1"
                              >Clear filters</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return displayTasks.map(task => (
                    <tr
                      key={task._id}
                      onClick={() => setSelectedTaskId(task._id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm
                          ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm
                          ${task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Right Column: Project Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-500" />
              Team Members
            </h3>
            <div className="space-y-4">
              {project.members && project.members.length > 0 ? (
                project.members.map(member => (
                  <div key={member._id} className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No members assigned.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Project Details
            </h3>
            <div className="text-sm space-y-3">
              <div>
                <span className="block text-slate-500">Created By</span>
                <span className="font-semibold text-slate-900">{project.createdBy?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="block text-slate-500">Created On</span>
                <span className="font-semibold text-slate-900">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskDetailsModal 
        task={selectedTask}
        users={allUsers}
        projects={allProjects}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={handleUpdateTask}
        onDuplicate={handleDuplicateTask}
        onDeleteRequest={handleDeleteTask}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Project?"
        message={`Are you sure you want to delete "${project?.name}"? All tasks and notifications inside this project will be permanently deleted.`}
        isDeleting={isDeleting}
        onConfirm={handleDeleteProject}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </Layout>
  );
}
