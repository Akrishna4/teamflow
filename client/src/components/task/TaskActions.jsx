import { Edit, Copy, Trash2 } from 'lucide-react';

export default function TaskActions({ onEdit, onDuplicate, onDelete, isDuplicating }) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onEdit}
        className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Edit className="w-4 h-4 mr-1.5" />
        Edit
      </button>
      <button
        onClick={onDuplicate}
        disabled={isDuplicating}
        className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Copy className="w-4 h-4 mr-1.5" />
        {isDuplicating ? '...' : 'Duplicate'}
      </button>
      <button
        onClick={onDelete}
        className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Delete
      </button>
    </div>
  );
}
