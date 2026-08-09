import { useState, useEffect } from 'react';

export default function TaskForm({ task, users, projects, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    priority: task?.priority || 'Medium',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    project: task?.project?._id || task?.project || '',
    assignedTo: task?.assignedTo?.map(u => u._id) || [],
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'To Do',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        project: task.project?._id || task.project || '',
        assignedTo: task.assignedTo?.map(u => u._id) || [],
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleAssignee = (userId) => {
    setFormData(prev => {
      const assignedTo = prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter(id => id !== userId)
        : [...prev.assignedTo, userId];
      return { ...prev, assignedTo };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title</label>
        <input
          type="text"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
        <textarea
          name="description"
          rows="3"
          value={formData.description}
          onChange={handleChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project</label>
          <select
            name="project"
            required
            value={formData.project}
            onChange={handleChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
          >
            <option value="">Select a Project</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assignees</label>
        <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
          {users.map(u => (
            <label key={u._id} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-500 rounded border-slate-300"
                checked={formData.assignedTo.includes(u._id)}
                onChange={() => toggleAssignee(u._id)}
              />
              <div className="ml-3">
                <span className="block text-sm font-medium text-slate-900">{u.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl shadow-md disabled:opacity-70"
        >
          {isSubmitting ? 'Saving...' : 'Save Task'}
        </button>
      </div>
    </form>
  );
}
