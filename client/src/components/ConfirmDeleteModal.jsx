import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDeleting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center text-rose-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold">Confirm Deletion</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm transition-colors disabled:opacity-70 flex items-center"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
