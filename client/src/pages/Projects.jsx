import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, X } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    members: []
  });

  const fetchAllData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        axios.get('/projects'),
        axios.get('/users')
      ]);
      setProjects(projectsRes.data.projects);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await axios.post('/projects', newProject);
      
      // Refetch to instantly update the UI
      const projectsRes = await axios.get('/projects');
      setProjects(projectsRes.data.projects);
      
      setIsModalOpen(false);
      setNewProject({ name: '', description: '', members: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMemberSelection = (userId) => {
    setNewProject(prev => {
      const members = prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId];
      return { ...prev, members };
    });
  };

  if (loading) return <Layout><div className="text-slate-500">Loading projects...</div></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your team projects</p>
        </div>
        {user?.role === 'Admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <Link key={project._id} to={`/projects/${project._id}`} className="block">
            <div className="glass-panel p-6 h-full hover:border-blue-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
              <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{project.description}</p>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-slate-600">
                  <Users className="w-4 h-4 mr-1.5 text-blue-500" />
                  {project.members?.length || 0} members
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
                  {project.tasks?.length || 0} tasks
                </span>
              </div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 glass-panel">
            No projects found.
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && user?.role === 'Admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              {error && (
                <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg border border-rose-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Q3 Marketing Campaign"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows="3"
                  placeholder="What is this project about?"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign Team Members</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">No users found</div>
                  ) : (
                    users.map(u => (
                      <label key={u._id} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                          checked={newProject.members.includes(u._id)}
                          onChange={() => toggleMemberSelection(u._id)}
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-medium text-slate-900">{u.name}</span>
                          <span className="block text-xs text-slate-500">{u.role}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Selected: {newProject.members.length} members</p>
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
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 flex items-center"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
