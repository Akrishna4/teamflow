import { Calendar, Flag, CheckSquare, Clock, AlertCircle, Tag } from 'lucide-react';
import TaskLabels from './TaskLabels';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isOverdue = (dateStr, status) => {
  if (!dateStr || status === 'Done') return false;
  return new Date(dateStr) < new Date();
};

export default function TaskView({ task, isUpdating, onStatusChange, isAdmin, newLabelEvent }) {
  const overdue = task ? isOverdue(task.dueDate, task.status) : false;

  const handleLabelsUpdate = (newLabels) => {
    // This is just optimistic UI at the task level. The API call is handled inside TaskLabels.
    // The socket 'task.updated' event will eventually reconcile this.
  };

  return (
    <div className="space-y-8">
      {/* Status + Priority + Title */}
      <div>
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={isUpdating}
            className={`appearance-none cursor-pointer pl-3 pr-8 py-1 text-xs leading-5 font-bold rounded-full border shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              task.status === 'Done'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : task.status === 'In Progress'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            } ${isUpdating ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.25rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
            }}
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>

          <span
            className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
              task.priority === 'High'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : task.priority === 'Medium'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {task.priority} Priority
          </span>

          {overdue && (
            <span className="flex items-center px-3 py-1 text-xs leading-5 font-bold rounded-full border bg-rose-50 text-rose-700 border-rose-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Overdue
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
      </div>

      {/* Description */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
          Description
        </h3>
        <p className="text-slate-600 whitespace-pre-wrap">
          {task.description || (
            <span className="italic text-slate-400">No description provided.</span>
          )}
        </p>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
            <Flag className="w-4 h-4 mr-1.5 text-blue-500" /> Project
          </h3>
          <p className="text-slate-900 font-medium">
            {task.project?.name || 'N/A'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
            <Tag className="w-4 h-4 mr-1.5 text-blue-500" /> Labels
          </h3>
          <TaskLabels
            taskId={task._id}
            projectId={task.project?._id || task.project}
            currentLabels={task.labels || []}
            onLabelsUpdate={handleLabelsUpdate}
            newLabelEvent={newLabelEvent}
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
            <CheckSquare className="w-4 h-4 mr-1.5 text-blue-500" /> Assignees
          </h3>
          <div className="flex flex-col space-y-2">
            {task.assignedTo && task.assignedTo.length > 0 ? (
              task.assignedTo.map((assignee) => (
                <div
                  key={assignee._id}
                  className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-2 w-fit pr-4"
                >
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-2 shadow-sm">
                    {assignee.name.charAt(0)}
                  </div>
                  <span className="text-slate-900 font-medium text-sm">
                    {assignee.name}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">
                    ({assignee.role})
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-500 italic text-sm">Unassigned</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-blue-500" /> Due Date
          </h3>
          {task.dueDate ? (
            <p className={`font-medium ${overdue ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatDate(task.dueDate)}
              {overdue && <span className="ml-2 text-xs text-rose-500">(overdue)</span>}
            </p>
          ) : (
            <p className="text-slate-400 italic text-sm">No due date set</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-blue-500" /> Created By
          </h3>
          <p className="text-slate-900 font-medium">
            {task.createdBy?.name || 'System'}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {new Date(task.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
