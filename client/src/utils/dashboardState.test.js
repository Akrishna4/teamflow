/**
 * dashboardState.test.js
 *
 * Unit tests for the pure dashboard state helper functions.
 * Tests run in Node environment (no DOM, no React) via Vitest.
 *
 * Coverage:
 *   - findTaskAcrossGroups
 *   - isTaskOverdue
 *   - recalculateSummary
 *   - moveTaskBetweenGroups (all status transitions + edge cases)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  findTaskAcrossGroups,
  isTaskOverdue,
  recalculateSummary,
  moveTaskBetweenGroups,
  STATUS_TO_GROUP,
} from './dashboardState.js';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const PAST_DATE = '2020-01-01T00:00:00.000Z';   // always in the past
const FUTURE_DATE = '2099-12-31T00:00:00.000Z'; // always in the future

function makeTask(overrides = {}) {
  return {
    _id: 'task-1',
    title: 'Test Task',
    status: 'To Do',
    dueDate: null,
    ...overrides,
  };
}

function makeEmptyDashboard() {
  return {
    summary: { assigned: 0, pending: 0, overdue: 0, completed: 0 },
    groups:  { assigned: [], pending: [], overdue: [], completed: [] },
    hasMore: { assigned: false, pending: false, overdue: false, completed: false },
  };
}

function dashboardWith(task, extraGroups = {}) {
  const d = makeEmptyDashboard();
  const group = STATUS_TO_GROUP[task.status];
  d.groups[group] = [task];
  d.summary[group] = 1;
  for (const [key, tasks] of Object.entries(extraGroups)) {
    d.groups[key] = tasks;
    d.summary[key] = tasks.length;
  }
  return d;
}

// ─────────────────────────────────────────────
// STATUS_TO_GROUP map
// ─────────────────────────────────────────────

describe('STATUS_TO_GROUP', () => {
  it('maps every valid status to a group key', () => {
    expect(STATUS_TO_GROUP['To Do']).toBe('assigned');
    expect(STATUS_TO_GROUP['In Progress']).toBe('pending');
    expect(STATUS_TO_GROUP['Done']).toBe('completed');
  });
});

// ─────────────────────────────────────────────
// findTaskAcrossGroups
// ─────────────────────────────────────────────

describe('findTaskAcrossGroups', () => {
  it('finds a task in the assigned group', () => {
    const task = makeTask({ _id: 'a1', status: 'To Do' });
    const groups = { assigned: [task], pending: [], completed: [], overdue: [] };
    const result = findTaskAcrossGroups(groups, 'a1');
    expect(result).toEqual({ task, groupKey: 'assigned' });
  });

  it('finds a task in the pending group', () => {
    const task = makeTask({ _id: 'p1', status: 'In Progress' });
    const groups = { assigned: [], pending: [task], completed: [], overdue: [] };
    const result = findTaskAcrossGroups(groups, 'p1');
    expect(result).toEqual({ task, groupKey: 'pending' });
  });

  it('finds a task in the overdue group', () => {
    const task = makeTask({ _id: 'o1', status: 'To Do', dueDate: PAST_DATE });
    const groups = { assigned: [task], pending: [], completed: [], overdue: [task] };
    const result = findTaskAcrossGroups(groups, 'o1');
    // findTaskAcrossGroups returns the FIRST occurrence (iteration order)
    expect(result?.task._id).toBe('o1');
  });

  it('returns null when the task does not exist in any group', () => {
    const groups = { assigned: [], pending: [], completed: [], overdue: [] };
    expect(findTaskAcrossGroups(groups, 'nonexistent')).toBeNull();
  });

  it('returns null for empty groups', () => {
    expect(findTaskAcrossGroups({ assigned: [], pending: [], completed: [], overdue: [] }, 'x')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// isTaskOverdue
// ─────────────────────────────────────────────

describe('isTaskOverdue', () => {
  it('returns false for a Done task with a past dueDate', () => {
    expect(isTaskOverdue(makeTask({ status: 'Done', dueDate: PAST_DATE }))).toBe(false);
  });

  it('returns false when dueDate is null', () => {
    expect(isTaskOverdue(makeTask({ status: 'To Do', dueDate: null }))).toBe(false);
  });

  it('returns false when dueDate is in the future', () => {
    expect(isTaskOverdue(makeTask({ status: 'To Do', dueDate: FUTURE_DATE }))).toBe(false);
  });

  it('returns true for a To Do task with a past dueDate', () => {
    expect(isTaskOverdue(makeTask({ status: 'To Do', dueDate: PAST_DATE }))).toBe(true);
  });

  it('returns true for an In Progress task with a past dueDate', () => {
    expect(isTaskOverdue(makeTask({ status: 'In Progress', dueDate: PAST_DATE }))).toBe(true);
  });

  it('returns false for null task', () => {
    expect(isTaskOverdue(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// recalculateSummary
// ─────────────────────────────────────────────

describe('recalculateSummary', () => {
  it('returns zeros for empty groups', () => {
    const groups = { assigned: [], pending: [], completed: [], overdue: [] };
    expect(recalculateSummary(groups)).toEqual({
      assigned: 0, pending: 0, completed: 0, overdue: 0,
    });
  });

  it('counts tasks correctly across groups', () => {
    const t = (id) => makeTask({ _id: id });
    const groups = {
      assigned:  [t('a1'), t('a2')],
      pending:   [t('p1')],
      completed: [t('c1'), t('c2'), t('c3')],
      overdue:   [t('o1')],
    };
    expect(recalculateSummary(groups)).toEqual({
      assigned: 2, pending: 1, completed: 3, overdue: 1,
    });
  });
});

// ─────────────────────────────────────────────
// moveTaskBetweenGroups — primary transitions
// ─────────────────────────────────────────────

describe('moveTaskBetweenGroups — status transitions', () => {
  it('To Do → In Progress: removes from assigned, adds to pending', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.assigned).toHaveLength(0);
    expect(result.groups.pending).toHaveLength(1);
    expect(result.groups.pending[0].status).toBe('In Progress');
    expect(result.groups.completed).toHaveLength(0);
  });

  it('In Progress → Done: removes from pending, adds to completed', () => {
    const task = makeTask({ _id: 't1', status: 'In Progress' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'Done');

    expect(result.groups.pending).toHaveLength(0);
    expect(result.groups.completed).toHaveLength(1);
    expect(result.groups.completed[0].status).toBe('Done');
  });

  it('Done → To Do: removes from completed, adds to assigned', () => {
    const task = makeTask({ _id: 't1', status: 'Done' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'To Do');

    expect(result.groups.completed).toHaveLength(0);
    expect(result.groups.assigned).toHaveLength(1);
    expect(result.groups.assigned[0].status).toBe('To Do');
  });

  it('Done → In Progress: removes from completed, adds to pending', () => {
    const task = makeTask({ _id: 't1', status: 'Done' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.completed).toHaveLength(0);
    expect(result.groups.pending).toHaveLength(1);
    expect(result.groups.pending[0].status).toBe('In Progress');
  });

  it('In Progress → To Do: removes from pending, adds to assigned', () => {
    const task = makeTask({ _id: 't1', status: 'In Progress' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'To Do');

    expect(result.groups.pending).toHaveLength(0);
    expect(result.groups.assigned).toHaveLength(1);
    expect(result.groups.assigned[0].status).toBe('To Do');
  });

  it('To Do → Done: removes from assigned, adds to completed', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'Done');

    expect(result.groups.assigned).toHaveLength(0);
    expect(result.groups.completed).toHaveLength(1);
    expect(result.groups.completed[0].status).toBe('Done');
  });

  it('updates the task status on the moved task object', () => {
    const task = makeTask({ _id: 't1', status: 'To Do', title: 'My Task' });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');
    const movedTask = result.groups.pending[0];

    expect(movedTask._id).toBe('t1');
    expect(movedTask.title).toBe('My Task');
    expect(movedTask.status).toBe('In Progress');
  });

  it('moved task is prepended to the destination group', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const existing = makeTask({ _id: 't2', status: 'In Progress' });
    const db = dashboardWith(task, { pending: [existing] });

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.pending[0]._id).toBe('t1');
    expect(result.groups.pending[1]._id).toBe('t2');
  });
});

// ─────────────────────────────────────────────
// moveTaskBetweenGroups — summary recalculation
// ─────────────────────────────────────────────

describe('moveTaskBetweenGroups — summary counts', () => {
  it('decrements source group count and increments dest group count', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = dashboardWith(task);
    expect(db.summary.assigned).toBe(1);
    expect(db.summary.pending).toBe(0);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');
    expect(result.summary.assigned).toBe(0);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.completed).toBe(0);
  });

  it('correctly counts when multiple tasks exist', () => {
    const t1 = makeTask({ _id: 't1', status: 'To Do' });
    const t2 = makeTask({ _id: 't2', status: 'To Do' });
    const t3 = makeTask({ _id: 't3', status: 'In Progress' });
    const db = makeEmptyDashboard();
    db.groups.assigned = [t1, t2];
    db.groups.pending = [t3];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');
    expect(result.summary.assigned).toBe(1);
    expect(result.summary.pending).toBe(2);
  });
});

// ─────────────────────────────────────────────
// moveTaskBetweenGroups — overdue cross-cut
// ─────────────────────────────────────────────

describe('moveTaskBetweenGroups — overdue transitions', () => {
  it('adds task to overdue when it becomes overdue after moving', () => {
    const task = makeTask({ _id: 't1', status: 'To Do', dueDate: PAST_DATE });
    // Start with task in assigned but NOT in overdue (edge case from migration)
    const db = dashboardWith(task);
    expect(db.groups.overdue).toHaveLength(0);

    // Move to In Progress — task is still overdue
    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');
    expect(result.groups.overdue).toHaveLength(1);
    expect(result.groups.overdue[0]._id).toBe('t1');
    expect(result.summary.overdue).toBe(1);
  });

  it('removes task from overdue when it is marked Done', () => {
    const task = makeTask({ _id: 't1', status: 'In Progress', dueDate: PAST_DATE });
    const db = makeEmptyDashboard();
    db.groups.pending = [task];
    db.groups.overdue = [task];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'Done');

    expect(result.groups.overdue).toHaveLength(0);
    expect(result.summary.overdue).toBe(0);
  });

  it('keeps task in overdue when moved between non-Done statuses with past dueDate', () => {
    const task = makeTask({ _id: 't1', status: 'To Do', dueDate: PAST_DATE });
    const db = makeEmptyDashboard();
    db.groups.assigned = [task];
    db.groups.overdue = [task];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.overdue).toHaveLength(1);
    expect(result.groups.overdue[0].status).toBe('In Progress');
    expect(result.summary.overdue).toBe(1);
  });

  it('does not add task to overdue when dueDate is in the future', () => {
    const task = makeTask({ _id: 't1', status: 'To Do', dueDate: FUTURE_DATE });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.overdue).toHaveLength(0);
    expect(result.summary.overdue).toBe(0);
  });

  it('does not add task to overdue when dueDate is null', () => {
    const task = makeTask({ _id: 't1', status: 'To Do', dueDate: null });
    const db = dashboardWith(task);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.overdue).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// moveTaskBetweenGroups — edge cases
// ─────────────────────────────────────────────

describe('moveTaskBetweenGroups — edge cases', () => {
  it('returns the original dashboard unchanged when task is not found', () => {
    const db = makeEmptyDashboard();
    const result = moveTaskBetweenGroups(db, 'nonexistent', 'In Progress');
    expect(result).toBe(db); // same reference — nothing was cloned
  });

  it('returns the original dashboard unchanged for an unknown status', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = dashboardWith(task);
    const result = moveTaskBetweenGroups(db, 't1', 'INVALID_STATUS');
    expect(result).toBe(db);
  });

  it('does not mutate the original dashboard groups arrays', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = dashboardWith(task);
    const originalAssigned = db.groups.assigned;
    const originalPending = db.groups.pending;

    moveTaskBetweenGroups(db, 't1', 'In Progress');

    // Original arrays must be unchanged (immutability check)
    expect(db.groups.assigned).toBe(originalAssigned);
    expect(db.groups.pending).toBe(originalPending);
    expect(db.groups.assigned).toHaveLength(1);
  });

  it('does not duplicate a task if it somehow appears in multiple groups', () => {
    const task = makeTask({ _id: 't1', status: 'To Do' });
    const db = makeEmptyDashboard();
    // Artificially place task in both assigned and pending (corrupt state)
    db.groups.assigned = [task];
    db.groups.pending = [task];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    // Should appear at most once in pending
    const pendingIds = result.groups.pending.map(t => t._id);
    expect(pendingIds.filter(id => id === 't1')).toHaveLength(1);
  });

  it('preserves other tasks in the source group', () => {
    const t1 = makeTask({ _id: 't1', status: 'To Do' });
    const t2 = makeTask({ _id: 't2', status: 'To Do' });
    const db = makeEmptyDashboard();
    db.groups.assigned = [t1, t2];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.assigned).toHaveLength(1);
    expect(result.groups.assigned[0]._id).toBe('t2');
  });

  it('preserves other tasks in the destination group', () => {
    const t1 = makeTask({ _id: 't1', status: 'To Do' });
    const t2 = makeTask({ _id: 't2', status: 'In Progress' });
    const db = makeEmptyDashboard();
    db.groups.assigned = [t1];
    db.groups.pending = [t2];
    db.summary = recalculateSummary(db.groups);

    const result = moveTaskBetweenGroups(db, 't1', 'In Progress');

    expect(result.groups.pending).toHaveLength(2);
    expect(result.groups.pending.find(t => t._id === 't2')).toBeDefined();
  });

  it('handles moving a task when all other groups are empty', () => {
    const task = makeTask({ _id: 't1', status: 'In Progress' });
    const db = makeEmptyDashboard();
    db.groups.pending = [task];
    db.summary.pending = 1;

    const result = moveTaskBetweenGroups(db, 't1', 'Done');

    expect(result.groups.pending).toHaveLength(0);
    expect(result.groups.completed).toHaveLength(1);
    expect(result.summary).toEqual({ assigned: 0, pending: 0, completed: 1, overdue: 0 });
  });
});
