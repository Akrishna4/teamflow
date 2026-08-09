export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
      <div className="flex justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
