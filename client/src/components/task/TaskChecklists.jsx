import { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, CheckCircle, Circle, GripVertical, ChevronUp, ChevronDown, CheckSquare } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';

// ─── Deduplication Helper ───────────────────────────────────────────────────

function upsertChecklist(list, incoming) {
  const exists = list.some((c) => c._id === incoming._id);
  if (exists) return list.map(c => c._id === incoming._id ? incoming : c);
  return [...list, incoming].sort((a, b) => a.order - b.order);
}

// ─── Checklist Item Component ───────────────────────────────────────────────

function ChecklistItem({ item, checklistId, projectId, isAdmin, onLocalUpdate, onLocalDelete, onLocalReorder, isFirst, isLast }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    if (isSubmitting) return;
    const newStatus = !item.completed;
    onLocalUpdate(checklistId, item._id, { completed: newStatus }, false);
    setIsSubmitting(true);
    try {
      await axios.put(`/v1/checklist-items/${item._id}`, {
        completed: newStatus,
        projectId
      });
      onLocalUpdate(checklistId, item._id, { completed: newStatus }, true);
    } catch (err) {
      onLocalUpdate(checklistId, item._id, { completed: !newStatus }, true); // rollback
      console.error('Failed to toggle item', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === item.title) {
      setIsEditing(false);
      return;
    }
    const oldTitle = item.title;
    onLocalUpdate(checklistId, item._id, { title: editTitle.trim() }, false);
    setIsEditing(false);
    setIsSubmitting(true);
    try {
      await axios.put(`/v1/checklist-items/${item._id}`, {
        title: editTitle.trim(),
        projectId
      });
      onLocalUpdate(checklistId, item._id, { title: editTitle.trim() }, true);
    } catch (err) {
      onLocalUpdate(checklistId, item._id, { title: oldTitle }, true);
      setIsEditing(true);
      console.error('Failed to rename item', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this item?')) return;
    onLocalDelete(checklistId, item._id, item); // Optimistic delete
    setIsSubmitting(true);
    try {
      await axios.delete(`/v1/checklist-items/${item._id}?projectId=${projectId}`);
    } catch (err) {
      onLocalDelete(checklistId, item._id, null, item); // Rollback
      console.error('Failed to delete item', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (direction) => {
    onLocalReorder(checklistId, item._id, direction);
  };

  return (
    <div className="flex items-start gap-3 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition" role="listitem">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.completed}
        aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
        onClick={handleToggle}
        disabled={isSubmitting}
        className={`mt-0.5 flex-shrink-0 transition-colors ${
          item.completed ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-blue-500'
        }`}
      >
        {item.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            aria-label="Edit item title"
            className="w-full bg-white border border-blue-500 rounded px-2 py-1 text-sm focus:outline-none"
            disabled={isSubmitting}
          />
        ) : (
          <span
            className={`text-sm block py-1 ${
              item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}
          >
            {item.title}
          </span>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!isFirst && (
            <button
              type="button"
              onClick={() => handleMove('up')}
              disabled={isSubmitting}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Move Up"
              aria-label="Move item up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              onClick={() => handleMove('down')}
              disabled={isSubmitting}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Move Down"
              aria-label="Move item down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isSubmitting}
              title="Edit item"
              aria-label="Edit item"
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded ml-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            title="Delete item"
            aria-label="Delete item"
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Checklist Component ────────────────────────────────────────────────────

function ChecklistBlock({ checklist, projectId, isAdmin, onLocalUpdate, onLocalDelete, onLocalItemUpdate, onLocalItemDelete, onLocalReorder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === checklist.title) {
      setIsEditing(false);
      return;
    }
    const oldTitle = checklist.title;
    onLocalUpdate(checklist._id, { title: editTitle.trim() });
    setIsEditing(false);
    setIsSubmitting(true);
    try {
      await axios.put(`/v1/checklists/${checklist._id}`, { title: editTitle.trim(), projectId });
    } catch (err) {
      onLocalUpdate(checklist._id, { title: oldTitle });
      setIsEditing(true);
      console.error('Failed to update checklist', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete checklist "${checklist.title}" and all its items?`)) return;
    onLocalDelete(checklist._id, checklist);
    setIsSubmitting(true);
    try {
      await axios.delete(`/v1/checklists/${checklist._id}?projectId=${projectId}`);
    } catch (err) {
      onLocalDelete(checklist._id, null, checklist); // rollback
      console.error('Failed to delete checklist', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    setIsAddingItem(true);
    try {
      await axios.post(`/v1/checklists/${checklist._id}/items`, {
        title: newItemTitle.trim(),
        projectId
      });
      setNewItemTitle('');
      // UI updates via socket checklist_item.created which returns enriched checklist
    } catch (err) {
      console.error('Failed to add item', err);
    } finally {
      setIsAddingItem(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
          {isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="flex-1 bg-white border border-blue-500 rounded px-2 py-1 text-sm font-semibold focus:outline-none"
              disabled={isSubmitting}
            />
          ) : (
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {checklist.title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-full">
            {checklist.progress}%
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isEditing && (
                <button
                  type="button"
                  title="Edit checklist title"
                  aria-label="Edit checklist title"
                  onClick={() => setIsEditing(true)}
                  disabled={isSubmitting}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                title="Delete checklist"
                aria-label="Delete checklist"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="h-1 w-full bg-slate-100" 
        role="progressbar" 
        aria-valuenow={checklist.progress} 
        aria-valuemin="0" 
        aria-valuemax="100"
      >
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${checklist.progress}%` }}
        />
      </div>

      {/* Items List */}
      <div className="p-4 space-y-1" role="list" aria-label={`Items for ${checklist.title}`}>
        {checklist.items.map((item, index) => (
          <ChecklistItem
            key={item._id}
            item={item}
            checklistId={checklist._id}
            projectId={projectId}
            isAdmin={isAdmin}
            onLocalUpdate={onLocalItemUpdate}
            onLocalDelete={onLocalItemDelete}
            onLocalReorder={onLocalReorder}
            isFirst={index === 0}
            isLast={index === checklist.items.length - 1}
          />
        ))}

        {isAdmin && (
          <form onSubmit={handleAddItem} className="mt-3">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Add an item..."
              aria-label="Add a new checklist item"
              disabled={isAddingItem}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main TaskChecklists Component ──────────────────────────────────────────

export default function TaskChecklists({ taskId, projectId, newChecklistEvent }) {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'Admin';
  
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/v1/tasks/${taskId}/checklists`);
      setChecklists(res.data.data);
    } catch (err) {
      console.error('Failed to fetch checklists', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) fetchChecklists();
  }, [taskId, fetchChecklists]);

  // Handle real-time socket events
  useEffect(() => {
    if (!newChecklistEvent) return;
    const { event, payload } = newChecklistEvent;

    setChecklists((prev) => {
      if (event === 'checklist.created' || event === 'checklist.updated' || 
          event === 'checklist_item.created' || event === 'checklist_item.updated' || event === 'checklist_item.deleted') {
        // payload is the fully enriched checklist object in all these cases
        return upsertChecklist(prev, payload);
      }
      
      if (event === 'checklist.deleted') {
        return prev.filter((c) => c._id !== payload._id);
      }
      
      return prev;
    });
  }, [newChecklistEvent]);

  // Optimistic Updaters
  
  const handleChecklistUpdate = useCallback((checklistId, updates) => {
    setChecklists((prev) => prev.map((c) => c._id === checklistId ? { ...c, ...updates } : c));
  }, []);

  const handleChecklistDelete = useCallback((checklistId, deletedChecklist = null, restoreChecklist = null) => {
    setChecklists((prev) => {
      if (restoreChecklist) return upsertChecklist(prev, restoreChecklist);
      return prev.filter((c) => c._id !== checklistId);
    });
  }, []);

  const handleItemUpdate = useCallback((checklistId, itemId, updates, updateProgress = false) => {
    setChecklists((prev) => prev.map((c) => {
      if (c._id !== checklistId) return c;
      const newItems = c.items.map((i) => i._id === itemId ? { ...i, ...updates } : i);
      
      let progress = c.progress;
      if (updateProgress) {
        const done = newItems.filter(i => i.completed).length;
        progress = newItems.length === 0 ? 0 : Math.round((done / newItems.length) * 100);
      }
      return { ...c, items: newItems, progress };
    }));
  }, []);

  const handleItemDelete = useCallback((checklistId, itemId, deletedItem = null, restoreItem = null) => {
    setChecklists((prev) => prev.map((c) => {
      if (c._id !== checklistId) return c;
      
      let newItems = c.items;
      if (restoreItem) {
        const exists = newItems.some(i => i._id === restoreItem._id);
        if (!exists) {
          newItems = [...newItems, restoreItem].sort((a, b) => a.order - b.order);
        }
      } else {
        newItems = newItems.filter(i => i._id !== itemId);
      }
      
      const done = newItems.filter(i => i.completed).length;
      const progress = newItems.length === 0 ? 0 : Math.round((done / newItems.length) * 100);
      
      return { ...c, items: newItems, progress };
    }));
  }, []);

  // Simple reorder: swaps the order of two items locally, then calls API
  const handleItemReorder = useCallback(async (checklistId, itemId, direction) => {
    setChecklists((prev) => {
      const checklist = prev.find(c => c._id === checklistId);
      if (!checklist) return prev;
      
      const idx = checklist.items.findIndex(i => i._id === itemId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === checklist.items.length - 1) return prev;
      
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newItems = [...checklist.items];
      
      // Swap order field
      const tempOrder = newItems[idx].order;
      newItems[idx] = { ...newItems[idx], order: newItems[targetIdx].order };
      newItems[targetIdx] = { ...newItems[targetIdx], order: tempOrder };
      
      // Sort array by order
      newItems.sort((a, b) => a.order - b.order);
      
      // Fire API call in background
      const orderedIds = newItems.map(i => i._id);
      axios.put(`/v1/checklists/${checklistId}/reorder`, { orderedIds, projectId })
        .catch(err => console.error('Failed to reorder', err));
        
      return prev.map(c => c._id === checklistId ? { ...c, items: newItems } : c);
    });
  }, [projectId]);

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      await axios.post(`/v1/tasks/${taskId}/checklists`, {
        title: newTitle.trim(),
        projectId
      });
      setNewTitle('');
      setIsCreating(false);
      // Socket event creates it locally
    } catch (err) {
      console.error('Failed to create checklist', err);
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Checklist Header */}
      {isAdmin && (
        <form onSubmit={handleCreateChecklist} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New checklist title..."
            disabled={isCreating}
            className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isCreating}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Checklist
          </button>
        </form>
      )}

      {/* Checklists List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : checklists.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No checklists yet"
          description={isAdmin ? "Create one above to break down this task." : "No checklists have been added to this task."}
        />
      ) : (
        <div className="space-y-6">
          {checklists.map((checklist) => (
            <ChecklistBlock
              key={checklist._id}
              checklist={checklist}
              projectId={projectId}
              isAdmin={isAdmin}
              onLocalUpdate={handleChecklistUpdate}
              onLocalDelete={handleChecklistDelete}
              onLocalItemUpdate={handleItemUpdate}
              onLocalItemDelete={handleItemDelete}
              onLocalReorder={handleItemReorder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
