import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import { Tag, Plus, X, Edit2, Trash2, Check, Settings } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function TaskLabels({ taskId, projectId, currentLabels = [], onLabelsUpdate, newLabelEvent }) {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'Admin';
  
  const [projectLabels, setProjectLabels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingLabel, setEditingLabel] = useState(null); // { _id, name, color } or null for new
  
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsManageMode(false);
        setEditingLabel(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjectLabels = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/v1/projects/${projectId}/labels`);
      setProjectLabels(res.data.data);
    } catch (err) {
      console.error('Failed to fetch project labels', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectLabels();
  }, [fetchProjectLabels]);

  // Handle socket events for project labels
  useEffect(() => {
    if (!newLabelEvent) return;
    const { event, payload } = newLabelEvent;
    
    setProjectLabels((prev) => {
      if (event === 'label.created') {
        if (prev.some(l => l._id === payload._id)) return prev;
        return [...prev, payload].sort((a, b) => a.name.localeCompare(b.name));
      }
      if (event === 'label.updated') {
        return prev.map(l => l._id === payload._id ? payload : l);
      }
      if (event === 'label.deleted') {
        return prev.filter(l => l._id !== payload._id);
      }
      return prev;
    });
  }, [newLabelEvent]);

  const toggleTaskLabel = async (label) => {
    if (isSubmitting) return;
    const isAssigned = currentLabels.some(l => l._id === label._id);
    
    // Optimistic Update
    let newLabels;
    if (isAssigned) {
      newLabels = currentLabels.filter(l => l._id !== label._id);
    } else {
      newLabels = [...currentLabels, label];
    }
    onLabelsUpdate(newLabels);
    
    setIsSubmitting(true);
    try {
      if (isAssigned) {
        await axios.delete(`/v1/tasks/${taskId}/labels/${label._id}?projectId=${projectId}`);
      } else {
        await axios.post(`/v1/tasks/${taskId}/labels/${label._id}`, { projectId });
      }
    } catch (err) {
      // Rollback
      onLabelsUpdate(currentLabels);
      console.error('Failed to toggle task label', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLabel = async (e) => {
    e.preventDefault();
    if (!editingLabel.name.trim() || !editingLabel.color) return;
    
    setIsSubmitting(true);
    try {
      if (editingLabel._id) {
        await axios.put(`/v1/labels/${editingLabel._id}`, {
          name: editingLabel.name.trim(),
          color: editingLabel.color,
          projectId
        });
      } else {
        await axios.post(`/v1/projects/${projectId}/labels`, {
          name: editingLabel.name.trim(),
          color: editingLabel.color
        });
      }
      setEditingLabel(null);
    } catch (err) {
      console.error('Failed to save label', err);
      if (err.response?.status === 409) {
        alert(err.response.data.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLabel = async (labelId) => {
    if (!window.confirm('Delete this label from the project? It will be removed from all tasks.')) return;
    setIsSubmitting(true);
    try {
      await axios.delete(`/v1/labels/${labelId}?projectId=${projectId}`);
      setEditingLabel(null);
    } catch (err) {
      console.error('Failed to delete label', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; // SMPTE C, Rec. 709 weightings
  };
  
  const getContrastColor = (hex) => {
    return getLuminance(hex) > 128 ? '#1e293b' : '#ffffff';
  };

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', 
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-2">
        {currentLabels.map(label => (
          <span
            key={label._id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm border border-black/5"
            style={{ backgroundColor: label.color, color: getContrastColor(label.color) }}
          >
            {label.name}
            <button
              onClick={() => toggleTaskLabel(label)}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors opacity-70 hover:opacity-100"
              disabled={isSubmitting}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors shadow-sm"
        >
          <Tag className="w-3.5 h-3.5" />
          {currentLabels.length === 0 ? 'Add Label' : ''}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              {isManageMode ? (editingLabel ? (editingLabel._id ? 'Edit Label' : 'New Label') : 'Manage Labels') : 'Labels'}
            </h4>
            <div className="flex items-center gap-2">
              {isManageMode && (
                <button
                  onClick={() => { setEditingLabel(null); setIsManageMode(false); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back
                </button>
              )}
              {!isManageMode && isAdmin && (
                <button
                  onClick={() => setIsManageMode(true)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-64 overflow-y-auto p-2">
            {loading && <div className="p-4 text-center text-sm text-slate-500">Loading...</div>}
            
            {!loading && !isManageMode && (
              <div className="space-y-1">
                {projectLabels.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500 italic">No labels in project</div>
                ) : (
                  projectLabels.map(label => {
                    const isAssigned = currentLabels.some(l => l._id === label._id);
                    return (
                      <button
                        key={label._id}
                        onClick={() => toggleTaskLabel(label)}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                            {label.name}
                          </span>
                        </div>
                        {isAssigned && <Check className="w-4 h-4 text-emerald-500" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {!loading && isManageMode && !editingLabel && (
              <div className="space-y-1">
                <button
                  onClick={() => setEditingLabel({ name: '', color: predefinedColors[0] })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-blue-50 text-blue-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Create New Label
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                {projectLabels.map(label => (
                  <div key={label._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm text-slate-700">{label.name}</span>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingLabel(label)} className="p-1 text-slate-400 hover:text-blue-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteLabel(label._id)} className="p-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && isManageMode && editingLabel && (
              <form onSubmit={handleSaveLabel} className="p-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingLabel.name}
                    onChange={(e) => setEditingLabel({...editingLabel, name: e.target.value})}
                    placeholder="e.g. Bug"
                    maxLength={50}
                    autoFocus
                    required
                    className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingLabel({...editingLabel, color: c})}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${editingLabel.color === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="color"
                      value={editingLabel.color}
                      onChange={(e) => setEditingLabel({...editingLabel, color: e.target.value})}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs text-slate-500 font-mono uppercase">{editingLabel.color}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLabel(null)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !editingLabel.name.trim()}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
