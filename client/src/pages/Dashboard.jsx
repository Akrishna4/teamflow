import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import Toast from '../components/Toast';
import { AuthContext } from '../context/AuthContext';
import { Check } from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Toast State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks/my-tasks');
      setTasks(res.data.tasks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleMarkDone = async (e, taskId) => {
    e.stopPropagation(); // Prevent modal from opening
    try {
      await axios.put(`/tasks/${taskId}/status`);
      
      // Instantly update UI locally
      setTasks(prevTasks => 
        prevTasks.map(t => t._id === taskId ? { ...t, status: 'Done' } : t)
      );
      
      setToastMessage('Task marked as completed');
      setShowToast(true);
    } catch (error) {
      console.error("Failed to mark task as done", error);
    }
  };

  if (loading) return <Layout><div className="text-slate-500">Loading dashboard...</div></Layout>;

  const todoTasks = tasks.filter(t => t.status === 'To Do');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const doneTasks = tasks.filter(t => t.status === 'Done');

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your assigned tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div className="glass-panel p-6 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-2"></span>
              To Do
            </h3>
            <span className="bg-white border border-slate-200 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">{todoTasks.length}</span>
          </div>
          <div className="space-y-3">
            {todoTasks.map(task => (
              <div 
                key={task._id} 
                onClick={() => setSelectedTaskId(task._id)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 relative group"
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm text-slate-900 pr-8">{task.title}</p>
                  {user?.role === 'Admin' && (
                    <button 
                      onClick={(e) => handleMarkDone(e, task._id)}
                      className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                      title="Mark as Done"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-end mt-3">
                  <p className="text-xs text-slate-500 flex items-center">
                    <span className="text-slate-400 mr-1">•</span> {task.project?.name}
                  </p>
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.assignedTo.slice(0, 3).map((assignee, idx) => (
                        <div key={idx} className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] border-2 border-white shadow-sm" title={assignee.name || 'User'}>
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
            ))}
            {todoTasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tasks</p>}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="glass-panel p-6 bg-blue-50/30 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              In Progress
            </h3>
            <span className="bg-white border border-blue-200 text-blue-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">{inProgressTasks.length}</span>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map(task => (
              <div 
                key={task._id} 
                onClick={() => setSelectedTaskId(task._id)}
                className="p-4 bg-white rounded-xl border border-blue-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 relative group"
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm text-slate-900 pr-8">{task.title}</p>
                  {user?.role === 'Admin' && (
                    <button 
                      onClick={(e) => handleMarkDone(e, task._id)}
                      className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                      title="Mark as Done"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-end mt-3">
                  <p className="text-xs text-slate-500 flex items-center">
                    <span className="text-blue-400 mr-1">•</span> {task.project?.name}
                  </p>
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.assignedTo.slice(0, 3).map((assignee, idx) => (
                        <div key={idx} className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] border-2 border-white shadow-sm" title={assignee.name || 'User'}>
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
            ))}
            {inProgressTasks.length === 0 && <p className="text-sm text-blue-400/70 text-center py-4">No tasks</p>}
          </div>
        </div>

        {/* Done Column */}
        <div className="glass-panel p-6 bg-emerald-50/30 border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
              Done
            </h3>
            <span className="bg-white border border-emerald-200 text-emerald-600 py-0.5 px-2.5 rounded-full text-xs font-semibold shadow-sm">{doneTasks.length}</span>
          </div>
          <div className="space-y-3">
            {doneTasks.map(task => (
              <div 
                key={task._id} 
                onClick={() => setSelectedTaskId(task._id)}
                className="p-4 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5"
              >
                <p className="font-semibold text-sm text-slate-900 line-through text-opacity-70">{task.title}</p>
                <div className="flex justify-between items-end mt-3">
                  <p className="text-xs text-slate-500 flex items-center">
                    <span className="text-emerald-400 mr-1">•</span> {task.project?.name}
                  </p>
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.assignedTo.slice(0, 3).map((assignee, idx) => (
                        <div key={idx} className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] border-2 border-white shadow-sm opacity-60" title={assignee.name || 'User'}>
                          {assignee.name ? assignee.name.charAt(0) : 'U'}
                        </div>
                      ))}
                      {task.assignedTo.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] border-2 border-white shadow-sm opacity-60">
                          +{task.assignedTo.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {doneTasks.length === 0 && <p className="text-sm text-emerald-400/70 text-center py-4">No tasks</p>}
          </div>
        </div>
      </div>

      <TaskDetailsModal 
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={fetchTasks}
      />

      <Toast 
        message={toastMessage} 
        show={showToast} 
        onClose={() => setShowToast(false)} 
      />
    </Layout>
  );
}
