import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function Toast({ message, show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 border border-slate-700">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors ml-4"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
