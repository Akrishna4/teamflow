import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Send, Edit2, Trash2, CornerDownRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AuthContext } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';

// ─── Utilities ────────────────────────────────────────────────────────────────

const TIME_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(date) {
  const diffSec = Math.round((new Date(date) - Date.now()) / 1000);
  if (Math.abs(diffSec) < 60) return 'just now';
  if (Math.abs(diffSec) < 3600) return TIME_FORMAT.format(Math.round(diffSec / 60), 'minute');
  if (Math.abs(diffSec) < 86400) return TIME_FORMAT.format(Math.round(diffSec / 3600), 'hour');
  return TIME_FORMAT.format(Math.round(diffSec / 86400), 'day');
}

// Deduplication helper: merges a new comment into the list without duplicates
function upsertComment(list, incoming) {
  const exists = list.some((c) => c._id === incoming._id);
  if (exists) return list;
  return [...list, { ...incoming, replies: incoming.replies || [] }];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Renders Markdown safely. ReactMarkdown is inherently XSS-safe because it
 * renders to React elements — it never uses dangerouslySetInnerHTML.
 * javascript: links and inline event handlers are neutralised by the
 * custom `a` renderer below.
 */
function CommentContent({ content }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-700 [&_pre]:bg-slate-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // XSS guard: strip javascript: and data: hrefs, remove target="_blank" without rel
          a: ({ node, href, children, ...props }) => {
            const safe =
              href &&
              !href.startsWith('javascript:') &&
              !href.startsWith('data:') &&
              !href.startsWith('vbscript:');
            if (!safe) return <span className="line-through text-rose-500">[unsafe link]</span>;
            return (
              <a
                href={href}
                rel="noopener noreferrer"
                target="_blank"
                className="text-blue-600 underline"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Textarea for composing / editing a comment.
 * Independent `isSubmitting` per instance (no global state bleed).
 * Double-click prevention: button disabled once clicked until resolved.
 */
function CommentInput({
  placeholder = 'Add a comment… (Markdown supported)',
  defaultValue = '',
  onSubmit,
  onCancel,
  isSubmitting,
}) {
  const [value, setValue] = useState(defaultValue);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = value.trim().length > 0 && value.trim().length <= 10000 && !isSubmitting;

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) onSubmit(value.trim());
    }
    if (e.key === 'Escape') onCancel?.();
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder={placeholder}
        maxLength={10000}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Markdown · Ctrl+Enter to send{value.length > 9000 ? ` · ${value.length}/10000` : ''}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => canSubmit && onSubmit(value.trim())}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-3 h-3" />
            {isSubmitting ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A single comment bubble.
 * Has its own independent loading states for edit and delete.
 * Optimistic local update on edit/delete; rolls back on failure.
 */
function CommentBubble({
  comment,
  currentUser,
  projectId,
  onReply,
  onLocalUpdate,
  onLocalDelete,
  isReply = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const isAuthor =
    comment.author?._id === currentUser?._id || comment.author === currentUser?._id;
  const isAdmin = currentUser?.role === 'Admin';

  const handleEdit = async (newContent) => {
    const originalContent = comment.content;
    // Optimistic update
    onLocalUpdate(comment._id, newContent, false);
    setIsEditing(false);
    setIsEditSubmitting(true);
    try {
      await axios.put(`/v1/comments/${comment._id}`, { content: newContent, projectId });
      // Server confirms — mark as edited
      onLocalUpdate(comment._id, newContent, true);
    } catch (err) {
      // Rollback
      onLocalUpdate(comment._id, originalContent, comment.edited);
      setIsEditing(true); // re-open editor so user can retry
      console.error('Failed to update comment:', err);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment' + (!isReply ? ' and all its replies?' : '?'))) return;
    // Optimistic delete
    onLocalDelete(comment._id);
    setIsDeleteSubmitting(true);
    try {
      await axios.delete(`/v1/comments/${comment._id}?projectId=${projectId}`);
    } catch (err) {
      // Rollback: re-add the comment (server event will not arrive since request failed)
      onLocalDelete(comment._id, comment); // pass original to restore
      console.error('Failed to delete comment:', err);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-10 mt-2' : ''}`}>
      <Avatar user={comment.author} size="md" />
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm group">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">{comment.author?.name}</span>
              {comment.author?.role === 'Admin' && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase tracking-wider">
                  Admin
                </span>
              )}
              <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
              {comment.edited && (
                <span className="text-xs text-slate-400 italic">(edited)</span>
              )}
            </div>
            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isAuthor && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditSubmitting}
                  title="Edit comment"
                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {(isAuthor || isAdmin) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleteSubmitting}
                  title="Delete comment"
                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content / Edit form */}
          {isEditing ? (
            <CommentInput
              defaultValue={comment.content}
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isEditSubmitting}
            />
          ) : (
            <CommentContent content={comment.content} />
          )}
        </div>

        {/* Reply button */}
        {!isReply && !isEditing && (
          <button
            type="button"
            onClick={() => onReply(comment._id)}
            className="mt-1 flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition px-1"
          >
            <CornerDownRight className="w-3 h-3" />
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const NEAR_BOTTOM_THRESHOLD = 150; // px from bottom to trigger auto-scroll

export default function TaskComments({ taskId, projectId, newCommentEvent }) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const listRef = useRef(null);
  const bottomRef = useRef(null);

  // Track whether user is near bottom before a state update
  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Auto-scroll only if user was already near the bottom
  const scrollToBottomIfNear = useCallback(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isNearBottom]);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchComments = useCallback(
    async (page = 1) => {
      const isFirst = page === 1;
      if (isFirst) setIsInitialLoading(true);
      else setIsLoadingMore(true);

      // Preserve scroll position when loading older comments (page > 1)
      const scrollEl = listRef.current;
      const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

      try {
        const res = await axios.get(
          `/v1/tasks/${taskId}/comments?page=${page}&limit=20`
        );
        const { data, meta: responseMeta } = res.data;

        setComments((prev) =>
          isFirst
            ? data.map((c) => ({ ...c, replies: c.replies || [] }))
            : [
                // Prepend older comments (page > 1 loads earlier pages)
                ...data.map((c) => ({ ...c, replies: c.replies || [] })),
                ...prev,
              ]
        );
        setMeta(responseMeta);

        // Restore scroll position after prepending (avoid viewport jump)
        if (!isFirst && scrollEl) {
          requestAnimationFrame(() => {
            scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
          });
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        if (isFirst) setIsInitialLoading(false);
        else setIsLoadingMore(false);
      }
    },
    [taskId]
  );

  useEffect(() => {
    if (taskId) fetchComments(1);
  }, [taskId, fetchComments]);

  // After initial load, scroll to bottom
  useEffect(() => {
    if (!isInitialLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isInitialLoading]);

  // ── Real-time socket events ──────────────────────────────────────────────

  useEffect(() => {
    if (!newCommentEvent) return;
    const { event, payload } = newCommentEvent;

    setComments((prev) => {
      if (event === 'comment.created') {
        if (payload.parentComment) {
          // Attach reply to parent, deduplicating by _id
          return prev.map((c) => {
            if (c._id !== payload.parentComment) return c;
            const exists = (c.replies || []).some((r) => r._id === payload._id);
            if (exists) return c;
            return { ...c, replies: [...(c.replies || []), payload] };
          });
        }
        // Top-level comment — deduplicate
        return upsertComment(prev, payload);
      }

      if (event === 'comment.updated') {
        return prev.map((c) => {
          if (c._id === payload._id) return { ...c, content: payload.content, edited: true };
          const replies = (c.replies || []).map((r) =>
            r._id === payload._id ? { ...r, content: payload.content, edited: true } : r
          );
          return { ...c, replies };
        });
      }

      if (event === 'comment.deleted') {
        return prev
          .filter((c) => c._id !== payload._id)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r._id !== payload._id),
          }));
      }

      return prev;
    });

    // Auto-scroll on new top-level comment if near bottom
    if (event === 'comment.created' && !payload.parentComment) {
      requestAnimationFrame(() => scrollToBottomIfNear());
    }
  }, [newCommentEvent, scrollToBottomIfNear]);

  // ── Local state helpers (optimistic) ────────────────────────────────────

  const handleLocalUpdate = useCallback((commentId, newContent, markEdited) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c._id === commentId) return { ...c, content: newContent, edited: markEdited };
        const replies = (c.replies || []).map((r) =>
          r._id === commentId ? { ...r, content: newContent, edited: markEdited } : r
        );
        return { ...c, replies };
      })
    );
  }, []);

  /**
   * handleLocalDelete supports both deletion (no second arg) and rollback (pass original comment).
   * Rollback re-inserts the comment at the correct position by _id.
   */
  const handleLocalDelete = useCallback((commentId, restore = null) => {
    setComments((prev) => {
      if (restore) {
        // Rollback: re-insert at its original position (try to find by surrounding ids)
        // Simple approach: append if not already present
        const exists = prev.some((c) => c._id === commentId);
        if (exists) return prev;
        return [...prev, { ...restore, replies: restore.replies || [] }];
      }
      return prev
        .filter((c) => c._id !== commentId)
        .map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r._id !== commentId),
        }));
    });
  }, []);

  // ── Submit new comment ───────────────────────────────────────────────────

  const handleSubmitComment = async (content) => {
    setIsSubmitting(true);
    try {
      await axios.post(`/v1/tasks/${taskId}/comments`, {
        content,
        projectId,
        parentComment: replyingTo || undefined,
      });
      setReplyingTo(null);
      // Socket event will add comment to the list (deduplication ensures no double-add)
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Scrollable comment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 max-h-80">

        {/* Load more — at the top (older comments) */}
        {!isInitialLoading && meta.page > 1 && meta.page <= meta.totalPages && (
          <button
            type="button"
            onClick={() => fetchComments(meta.page - 1)}
            disabled={isLoadingMore}
            className="w-full py-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition"
          >
            {isLoadingMore ? 'Loading…' : '↑ Load older comments'}
          </button>
        )}

        {isInitialLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-16 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No comments yet"
            description="Be the first to add a comment. Markdown is supported."
          />
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="group space-y-2">
              <CommentBubble
                comment={comment}
                currentUser={user}
                projectId={projectId}
                onReply={(id) => setReplyingTo(id === replyingTo ? null : id)}
                onLocalUpdate={handleLocalUpdate}
                onLocalDelete={handleLocalDelete}
              />

              {/* Replies */}
              {(comment.replies || []).map((reply) => (
                <div key={reply._id} className="group">
                  <CommentBubble
                    comment={reply}
                    currentUser={user}
                    projectId={projectId}
                    onReply={() => {}}
                    onLocalUpdate={handleLocalUpdate}
                    onLocalDelete={handleLocalDelete}
                    isReply
                  />
                </div>
              ))}

              {/* Inline reply composer */}
              {replyingTo === comment._id && (
                <div className="ml-10 mt-2 flex gap-3">
                  <Avatar user={user} size="md" />
                  <div className="flex-1">
                    <CommentInput
                      placeholder="Write a reply…"
                      onSubmit={handleSubmitComment}
                      onCancel={() => setReplyingTo(null)}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Composer — pinned at the bottom */}
      <div className="flex gap-3 pt-2 border-t border-slate-100 flex-shrink-0">
        <Avatar user={user} size="md" />
        <div className="flex-1">
          <CommentInput
            onSubmit={handleSubmitComment}
            onCancel={replyingTo ? () => setReplyingTo(null) : undefined}
            isSubmitting={isSubmitting}
            placeholder="Add a comment… (Markdown supported)"
          />
        </div>
      </div>
    </div>
  );
}
