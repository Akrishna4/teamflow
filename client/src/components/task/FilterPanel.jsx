import { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter, X, Save, Check } from 'lucide-react';

export default function FilterPanel({ 
  projectId, 
  activeFilters, 
  setActiveFilters, 
  users, 
  labels,
  onApply
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [newViewName, setNewViewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) fetchSavedViews();
  }, [projectId]);

  const fetchSavedViews = async () => {
    try {
      const res = await axios.get(`/v1/views?projectId=${projectId}`);
      setSavedViews(res.data.data);
    } catch (err) {
      console.error('Failed to load saved views', err);
    }
  };

  const handleFilterChange = (key, value) => {
    const updated = { ...activeFilters };
    if (!updated[key]) updated[key] = [];
    
    if (updated[key].includes(value)) {
      updated[key] = updated[key].filter(v => v !== value);
    } else {
      updated[key].push(value);
    }
    setActiveFilters(updated);
  };

  const handleSingleChange = (key, value) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setActiveFilters({
      status: [],
      priority: [],
      assignedTo: [],
      labels: [],
      sort: '-createdAt'
    });
  };

  const saveView = async () => {
    if (!newViewName.trim()) return;
    setIsSaving(true);
    try {
      await axios.post('/v1/views', {
        name: newViewName,
        project: projectId,
        filters: activeFilters,
        sort: activeFilters.sort
      });
      setNewViewName('');
      fetchSavedViews();
    } catch (err) {
      console.error('Failed to save view', err);
    } finally {
      setIsSaving(false);
    }
  };

  const loadView = (view) => {
    setActiveFilters({
      ...view.filters,
      sort: view.sort || '-createdAt'
    });
    setIsOpen(false);
  };

  const deleteView = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/v1/views/${id}`);
      fetchSavedViews();
    } catch (err) {
      console.error('Failed to delete view', err);
    }
  };

  const getActiveCount = () => {
    let count = 0;
    ['status', 'priority', 'assignedTo', 'labels'].forEach(k => {
      if (activeFilters[k]?.length) count += activeFilters[k].length;
    });
    if (activeFilters.dueDate) count += 1;
    return count;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
          getActiveCount() > 0 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Filter className="w-4 h-4 mr-2" />
        Filter & Sort
        {getActiveCount() > 0 && (
          <span className="ml-2 bg-blue-600 text-white text-xs py-0.5 px-2 rounded-full">
            {getActiveCount()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 max-h-[80vh] overflow-y-auto">
          
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800">Advanced Filters</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['To Do', 'In Progress', 'Done'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange('status', status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      activeFilters.status?.includes(status)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Priority</label>
              <div className="flex flex-wrap gap-2">
                {['Low', 'Medium', 'High'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => handleFilterChange('priority', priority)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      activeFilters.priority?.includes(priority)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            {users && users.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assignee</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <button
                      key={u._id}
                      onClick={() => handleFilterChange('assignedTo', u._id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        activeFilters.assignedTo?.includes(u._id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {labels && labels.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Labels</label>
                <div className="flex flex-wrap gap-2">
                  {labels.map(l => (
                    <button
                      key={l._id}
                      onClick={() => handleFilterChange('labels', l._id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        activeFilters.labels?.includes(l._id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Sort By</label>
              <select
                value={activeFilters.sort || '-createdAt'}
                onChange={(e) => handleSingleChange('sort', e.target.value)}
                className="w-full text-sm border-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="priority_desc">Priority (High to Low)</option>
                <option value="dueDate_asc">Due Date (Earliest)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-center gap-2">
                <button 
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => { onApply(); setIsOpen(false); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Apply Filter
                </button>
              </div>

              {/* Save View */}
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="text" 
                  placeholder="View name..."
                  className="flex-1 text-sm border-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                />
                <button 
                  onClick={saveView}
                  disabled={!newViewName.trim() || isSaving}
                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors"
                  title="Save View"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Saved Views List */}
            {savedViews.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Saved Views</label>
                <ul className="space-y-1">
                  {savedViews.map(v => (
                    <li key={v._id} className="group flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={() => loadView(v)}>
                      <span className="text-slate-700 font-medium truncate">{v.name}</span>
                      <button 
                        onClick={(e) => deleteView(v._id, e)}
                        className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete view"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
