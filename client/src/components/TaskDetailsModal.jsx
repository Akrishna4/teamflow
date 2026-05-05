import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { X, Calendar, Flag, CheckSquare, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function TaskDetailsModal({ taskId, isOpen, onClose, onTaskUpdated }) {
  const { user } = useContext(AuthContext);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isOpen || !taskId) return;
    
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/tasks/${taskId}`);
        setTask(res.data.task);
      } catch (error) {
        console.error("Failed to fetch task details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId, isOpen]);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      await axios.put(`/tasks/${taskId}`, { status: newStatus });
      setTask({ ...task, status: newStatus });
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Task Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-rose-50">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : task ? (
            <div className="space-y-8">
              {/* Header Area */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  {/* Interactive Status Dropdown */}
                  <div className="flex items-center">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={isUpdating || user?.role !== 'Admin'}
                      className={`appearance-none cursor-pointer pl-3 pr-8 py-1 text-xs leading-5 font-bold rounded-full border shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-slate-100 text-slate-700 border-slate-200'
                      } ${isUpdating || user?.role !== 'Admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: `right 0.25rem center`,
                        backgroundRepeat: `no-repeat`,
                        backgroundSize: `1.5em 1.5em`
                      }}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm
                    ${task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                      task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {task.priority} Priority
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Description</h3>
                <p className="text-slate-600 whitespace-pre-wrap">
                  {task.description || <span className="italic text-slate-400">No description provided.</span>}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
                    <Flag className="w-4 h-4 mr-1.5 text-blue-500" /> Project
                  </h3>
                  <p className="text-slate-900 font-medium">{task.project?.name || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
                    <CheckSquare className="w-4 h-4 mr-1.5 text-blue-500" /> Assignees
                  </h3>
                  <div className="flex flex-col space-y-2">
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      task.assignedTo.map(assignee => (
                        <div key={assignee._id} className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-2 w-fit pr-4">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-2 shadow-sm">
                            {assignee.name.charAt(0)}
                          </div>
                          <span className="text-slate-900 font-medium text-sm">{assignee.name}</span>
                          <span className="text-slate-400 text-xs ml-2">({assignee.role})</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-sm">Unassigned</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-blue-500" /> Created By
                  </h3>
                  <p className="text-slate-900 font-medium">{task.createdBy?.name || 'System'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-blue-500" /> Created On
                  </h3>
                  <p className="text-slate-900 font-medium">{new Date(task.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-rose-500">Failed to load task details.</div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
