/**
 * dashboardState.js
 *
 * Pure helper functions for reconciling the My Tasks dashboard state.
 *
 * These are intentionally side-effect-free so they can be:
 *   - Used inside React setState updaters
 *   - Unit-tested without mocking React
 *   - Reused across MyTasks, Dashboard, and any future pages
 *
 * Dashboard shape assumed throughout:
 * {
 *   summary: { assigned: number, pending: number, overdue: number, completed: number },
 *   groups:  { assigned: Task[], pending: Task[], overdue: Task[], completed: Task[] },
 *   hasMore: { assigned: boolean, pending: boolean, overdue: boolean, completed: boolean }
 * }
 *
 * Status → group mapping:
 *   "To Do"       → "assigned"
 *   "In Progress" → "pending"
 *   "Done"        → "completed"
 *   "overdue"     is a computed cross-cut of tasks that are past their dueDate and not Done
 */

/** Maps a task status string to the canonical dashboard group key. */
export const STATUS_TO_GROUP = {
  'To Do': 'assigned',
  'In Progress': 'pending',
  'Done': 'completed',
};

/**
 * Searches every group in the dashboard for a task by its _id.
 *
 * @param {Object} groups - The dashboard.groups object
 * @param {string} taskId
 * @returns {{ task: Object, groupKey: string } | null}
 */
export function findTaskAcrossGroups(groups, taskId) {
  for (const [groupKey, tasks] of Object.entries(groups)) {
    const task = tasks.find(t => t._id === taskId);
    if (task) return { task, groupKey };
  }
  return null;
}

/**
 * Returns whether a task should appear in the "overdue" group.
 * A task is overdue when:
 *   - its status is NOT "Done", AND
 *   - it has a dueDate, AND
 *   - that dueDate is in the past
 *
 * @param {Object} task
 * @returns {boolean}
 */
export function isTaskOverdue(task) {
  if (!task || task.status === 'Done' || !task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
}

/**
 * Recomputes summary counts from the current groups object.
 * The overdue count comes directly from groups.overdue.length
 * because overdue is a computed cross-cut maintained separately.
 *
 * @param {Object} groups - { assigned, pending, completed, overdue }
 * @returns {{ assigned: number, pending: number, completed: number, overdue: number }}
 */
export function recalculateSummary(groups) {
  return {
    assigned: groups.assigned.length,
    pending: groups.pending.length,
    completed: groups.completed.length,
    overdue: groups.overdue.length,
  };
}

/**
 * Returns a new dashboard state with the task moved to the correct group
 * according to its new status, and the overdue cross-cut adjusted accordingly.
 *
 * This function is pure: it never mutates its arguments.
 *
 * @param {Object} dashboard - Current dashboard state
 * @param {string} taskId    - ID of the task to move
 * @param {string} newStatus - The new status value ("To Do" | "In Progress" | "Done")
 * @returns {Object} New dashboard state, or the original state if nothing changed
 */
export function moveTaskBetweenGroups(dashboard, taskId, newStatus) {
  const destGroup = STATUS_TO_GROUP[newStatus];
  if (!destGroup) return dashboard; // Unrecognised status — leave state unchanged

  const found = findTaskAcrossGroups(dashboard.groups, taskId);
  if (!found) return dashboard; // Task not in any group — let socket reconcile

  const { task: foundTask, groupKey: sourceGroup } = found;

  // If the task is already in the right primary group, only handle overdue changes
  const updatedTask = { ...foundTask, status: newStatus };
  const taskWasOverdue = dashboard.groups.overdue.some(t => t._id === taskId);
  const taskIsNowOverdue = isTaskOverdue(updatedTask);

  // If primary group AND overdue membership are unchanged, no update needed
  if (destGroup === sourceGroup && taskWasOverdue === taskIsNowOverdue) {
    return dashboard;
  }

  // Build new groups immutably
  const newGroups = {
    assigned:  [...dashboard.groups.assigned],
    pending:   [...dashboard.groups.pending],
    completed: [...dashboard.groups.completed],
    overdue:   [...dashboard.groups.overdue],
  };

  // Remove from source primary group (if it changed)
  if (destGroup !== sourceGroup) {
    newGroups[sourceGroup] = newGroups[sourceGroup].filter(t => t._id !== taskId);
    // Prepend to dest group for recency (most-recently-changed task appears first)
    newGroups[destGroup] = [updatedTask, ...newGroups[destGroup].filter(t => t._id !== taskId)];
  } else {
    // Same primary group — update the task in-place
    newGroups[sourceGroup] = newGroups[sourceGroup].map(t =>
      t._id === taskId ? updatedTask : t
    );
  }

  // Reconcile overdue cross-cut
  if (taskIsNowOverdue && !taskWasOverdue) {
    newGroups.overdue = [updatedTask, ...newGroups.overdue.filter(t => t._id !== taskId)];
  } else if (!taskIsNowOverdue && taskWasOverdue) {
    newGroups.overdue = newGroups.overdue.filter(t => t._id !== taskId);
  } else if (taskIsNowOverdue && taskWasOverdue) {
    // Still overdue but status may have changed — update in-place
    newGroups.overdue = newGroups.overdue.map(t =>
      t._id === taskId ? updatedTask : t
    );
  }

  return {
    ...dashboard,
    groups: newGroups,
    summary: recalculateSummary(newGroups),
  };
}
