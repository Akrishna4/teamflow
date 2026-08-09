import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import Tabs from './ui/Tabs';
import TaskView from './task/TaskView';
import TaskForm from './task/TaskForm';
import TaskActions from './task/TaskActions';
import TaskComments from './task/TaskComments';
import TaskChecklists from './task/TaskChecklists';
import TaskAttachments from './task/TaskAttachments';
import TaskHistory from './task/TaskHistory';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
];

export default function TaskDetailsModal({
  task,
  users = [],
  projects = [],
  isOpen,
  onClose,
  onUpdate,
  onDuplicate,
  onDeleteRequest,
}) {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext); // SocketContext value IS the socket instance
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCommentEvent, setLastCommentEvent] = useState(null);
  const [lastChecklistEvent, setLastChecklistEvent] = useState(null);
  const [lastLabelEvent, setLastLabelEvent] = useState(null);
  const [lastAttachmentEvent, setLastAttachmentEvent] = useState(null);
  const [lastHistoryEvent, setLastHistoryEvent] = useState(null);

  const isAdmin = user?.role === 'Admin';

  // Reset state when the task changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('overview');
    setIsEditing(false);
  }, [isOpen, task?._id]);

  // Forward socket comment events to the TaskComments child
  useEffect(() => {
    if (!socket || !task) return;

    const handleCommentEvent = (eventName) => (payload) => {
      // Only care about events for THIS task
      const payloadTaskId = payload?.task || payload?.task?._id;
      if (payloadTaskId && payloadTaskId !== task._id) return;
      setLastCommentEvent({ event: eventName, payload, ts: Date.now() });
    };

    const handleChecklistEvent = (eventName) => (payload) => {
      const payloadTaskId = payload?.task || payload?.task?._id || payload?.checklist?.task;
      if (payloadTaskId && payloadTaskId !== task._id) return;
      setLastChecklistEvent({ event: eventName, payload, ts: Date.now() });
    };

    const handleLabelEvent = (eventName) => (payload) => {
      // label events are not scoped to a specific task, they are project-wide
      // except when task.updated is fired which handles assignment
      setLastLabelEvent({ event: eventName, payload, ts: Date.now() });
    };

    const handleAttachmentEvent = (eventName) => (payload) => {
      const payloadTaskId = payload?.task || payload?.task?._id || payload?.taskId;
      if (payloadTaskId && payloadTaskId !== task._id) return;
      setLastAttachmentEvent({ event: eventName, payload, ts: Date.now() });
    };

    const handleHistoryEvent = (eventName) => (payload) => {
      const payloadTaskId = payload?.entityId || payload?.taskId;
      if (payloadTaskId && payloadTaskId !== task._id) return;
      setLastHistoryEvent({ event: eventName, payload, ts: Date.now(), taskId: payloadTaskId });
    };

    const handlers = {
      'comment.created': handleCommentEvent('comment.created'),
      'comment.updated': handleCommentEvent('comment.updated'),
      'comment.deleted': handleCommentEvent('comment.deleted'),
      'checklist.created': handleChecklistEvent('checklist.created'),
      'checklist.updated': handleChecklistEvent('checklist.updated'),
      'checklist.deleted': handleChecklistEvent('checklist.deleted'),
      'checklist_item.created': handleChecklistEvent('checklist_item.created'),
      'checklist_item.updated': handleChecklistEvent('checklist_item.updated'),
      'checklist_item.deleted': handleChecklistEvent('checklist_item.deleted'),
      'label.created': handleLabelEvent('label.created'),
      'label.updated': handleLabelEvent('label.updated'),
      'label.deleted': handleLabelEvent('label.deleted'),
      'attachment.uploaded': handleAttachmentEvent('attachment.uploaded'),
      'attachment.deleted': handleAttachmentEvent('attachment.deleted'),
      'history.created': handleHistoryEvent('history.created'),
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
    };
  }, [socket, task?._id]);

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus) => {
    setIsSubmitting(true);
    try {
      // Use the /status endpoint which is open to all authenticated users,
      // not /tasks/:id which is Admin-only for full edits.
      await axios.put(`/tasks/${task._id}/status`, { status: newStatus });
      // Notify parent to apply optimistic update (the socket will also reconcile)
      onUpdate(task._id, { status: newStatus });
    } catch (err) {
      // Surface the error to the console; the socket will reconcile state
      // eslint-disable-next-line no-console
      console.error('Failed to update task status:', err?.response?.data || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    await onUpdate(task._id, formData);
    setIsSubmitting(false);
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Task' : 'Task Details'}
          </h2>
          <div className="flex items-center space-x-4">
            {!isEditing && isAdmin && (
              <TaskActions
                onEdit={() => setIsEditing(true)}
                onDuplicate={() => onDuplicate(task._id)}
                onDelete={() => onDeleteRequest(task)}
                isDuplicating={isSubmitting}
              />
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-rose-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs — only shown in view mode */}
        {!isEditing && (
          <div className="px-6 flex-shrink-0">
            <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isEditing ? (
            <TaskForm
              task={task}
              users={users}
              projects={projects}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isSubmitting}
            />
          ) : activeTab === 'overview' ? (
            <TaskView
              task={task}
              isUpdating={isSubmitting}
              onStatusChange={handleStatusChange}
              isAdmin={isAdmin}
              newLabelEvent={lastLabelEvent}
            />
          ) : activeTab === 'checklists' ? (
            <TaskChecklists
              taskId={task._id}
              projectId={task.project?._id || task.project}
              newChecklistEvent={lastChecklistEvent}
            />
          ) : activeTab === 'attachments' ? (
            <TaskAttachments
              taskId={task._id}
              projectId={task.project?._id || task.project}
              newAttachmentEvent={lastAttachmentEvent}
            />
          ) : activeTab === 'history' ? (
            <TaskHistory
              taskId={task._id}
              newHistoryEvent={lastHistoryEvent}
            />
          ) : (
            <TaskComments
              taskId={task._id}
              projectId={task.project?._id || task.project}
              newCommentEvent={lastCommentEvent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
