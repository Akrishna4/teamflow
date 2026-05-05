import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { ArrowLeft, Users, Clock } from 'lucide-react';

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(`/projects/${id}`);
        setProject(res.data.project);
      } catch (err) {
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) return <Layout><div className="text-slate-500">Loading project details...</div></Layout>;
  if (error || !project) return <Layout><div className="text-rose-500">{error || 'Project not found'}</div></Layout>;

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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Project Tasks</h2>
          <div className="glass-panel overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {project.tasks && project.tasks.length > 0 ? (
                  project.tasks.map(task => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                      No tasks created for this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {
          // Refetch project to update task statuses in the table
          axios.get(`/projects/${id}`).then(res => setProject(res.data.project));
        }}
      />
    </Layout>
  );
}
