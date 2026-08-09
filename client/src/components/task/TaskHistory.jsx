import { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { 
  History, Clock, MessageSquare, CheckSquare, 
  Tag, Paperclip, Edit, Trash2, Plus, Flag 
} from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import Avatar from '../ui/Avatar';

// Utility for relative time
function getRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Maps action names to readable strings and icons
function getActionInfo(action) {
  switch (action) {
    case 'comment.created': return { text: 'added a comment', icon: MessageSquare, color: 'text-blue-500' };
    case 'comment.updated': return { text: 'edited a comment', icon: Edit, color: 'text-slate-500' };
    case 'comment.deleted': return { text: 'deleted a comment', icon: Trash2, color: 'text-rose-500' };
    
    case 'checklist.created': return { text: 'added a checklist', icon: CheckSquare, color: 'text-emerald-500' };
    case 'checklist.updated': return { text: 'updated a checklist', icon: Edit, color: 'text-slate-500' };
    case 'checklist.deleted': return { text: 'deleted a checklist', icon: Trash2, color: 'text-rose-500' };
    
    case 'checklist_item.created': return { text: 'added an item to checklist', icon: Plus, color: 'text-emerald-500' };
    case 'checklist_item.updated': return { text: 'updated a checklist item', icon: CheckSquare, color: 'text-slate-500' };
    case 'checklist_item.deleted': return { text: 'deleted a checklist item', icon: Trash2, color: 'text-rose-500' };
    
    case 'label.created': return { text: 'created a project label', icon: Tag, color: 'text-purple-500' };
    case 'label.updated': return { text: 'updated a project label', icon: Tag, color: 'text-slate-500' };
    case 'label.deleted': return { text: 'deleted a project label', icon: Trash2, color: 'text-rose-500' };
    
    case 'task.updated': return { text: 'updated the task', icon: Edit, color: 'text-slate-500' };
    
    case 'attachment.uploaded': return { text: 'uploaded an attachment', icon: Paperclip, color: 'text-indigo-500' };
    case 'attachment.deleted': return { text: 'deleted an attachment', icon: Trash2, color: 'text-rose-500' };
    
    default: return { text: action, icon: Flag, color: 'text-slate-400' };
  }
}

export default function TaskHistory({ taskId, newHistoryEvent }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (pageNum = 1) => {
    try {
      const res = await axios.get(`/v1/activity?entityModel=Task&entityId=${taskId}&page=${pageNum}&limit=20`);
      const data = res.data.data;
      if (pageNum === 1) {
        setTimeline(data);
      } else {
        setTimeline(prev => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
    } catch (err) {
      console.error('Failed to fetch task history', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) fetchHistory(1);
  }, [taskId, fetchHistory]);

  useEffect(() => {
    if (!newHistoryEvent) return;
    const { payload, taskId: eventTaskId } = newHistoryEvent;
    
    // Ignore events for other tasks
    if (eventTaskId && eventTaskId !== taskId) return;
    
    setTimeline((prev) => {
      // Prevent duplicates
      if (prev.some(item => item._id === payload._id)) return prev;
      return [payload, ...prev];
    });
  }, [newHistoryEvent, taskId]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-slate-50 rounded w-1/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {timeline.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Actions performed on this task will appear here."
        />
      ) : (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {timeline.map((event, eventIdx) => {
              const { text, icon: Icon, color } = getActionInfo(event.action);
              const isLast = eventIdx === timeline.length - 1;

              return (
                <li key={event._id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        {event.user?.avatar ? (
                          <img
                            className="h-8 w-8 rounded-full bg-slate-100 ring-8 ring-white"
                            src={event.user.avatar}
                            alt=""
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 ring-8 ring-white flex items-center justify-center border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">
                              {event.user?.name ? event.user.name.charAt(0) : '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-slate-500">
                            <span className="font-bold text-slate-900 mr-1">
                              {event.user?.name || 'Unknown User'}
                            </span>
                            {text}
                            {/* Render metadata changes snippet if available */}
                            {event.metadata && Object.keys(event.metadata).length > 0 && event.action !== 'comment.created' && (
                              <span className="ml-1 inline-flex items-center">
                                <Icon className={`w-3.5 h-3.5 ml-1 mr-1 ${color}`} />
                                <span className="text-xs italic bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  {Object.keys(event.metadata).join(', ')} updated
                                </span>
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(event.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasMore && timeline.length > 0 && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={loadMore}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full transition-colors"
          >
            Load Older History
          </button>
        </div>
      )}
    </div>
  );
}
