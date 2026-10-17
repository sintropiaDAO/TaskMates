// @vitest-environment jsdom
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskSubtypeFields } from '@/lib/taskSubtypes';

const mocks = vi.hoisted(() => ({
  props: {} as any,
  insert: vi.fn(),
  update: vi.fn(),
  savedRow: {} as any,
  error: null as any,
}));

vi.mock('@/components/tasks/CreateTaskModal', () => ({
  CreateTaskModal: (props: any) => { mocks.props = props; return null; },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/lib/create-notification.functions', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/register-task-completion.functions', () => ({ registerTaskCompletion: vi.fn() }));
vi.mock('@/lib/roll-lucky-star.functions', () => ({ rollLuckyStar: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'tasks') return {
        insert: vi.fn(async () => ({ error: null })),
        delete: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ eq: async () => ({ data: [] }) }),
      };
      return {
        insert: (payload: any) => {
          mocks.insert(payload);
          mocks.savedRow = { id: 'task-id', ...payload };
          return { select: () => ({ single: async () => ({ data: mocks.error ? null : mocks.savedRow, error: mocks.error }) }) };
        },
        update: (payload: any) => {
          mocks.update(payload);
          mocks.savedRow = { ...mocks.savedRow, ...payload };
          return { eq: async () => ({ error: mocks.error }) };
        },
        select: () => ({ eq: () => ({ single: async () => ({ data: mocks.savedRow }) }) }),
      };
    },
  },
}));

import { CreateTaskModalHost } from './CreateTaskModalHost';

const base: TaskSubtypeFields = {
  task_subtype: 'service', meeting_url: null, meeting_notes: null,
  event_is_hybrid: false, event_max_attendees: null,
  service_delivery_format: null, project_deliverables: null,
};
const submit = (fields: TaskSubtypeFields) => mocks.props.onSubmit(
  'Test task', '', 'offer', [], undefined, undefined, null, undefined, undefined, fields,
);

describe('task subtype saves before list refresh', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.savedRow = {}; mocks.error = null; });
  afterEach(cleanup);

  it.each([
    { ...base, task_subtype: 'meeting', meeting_url: 'https://meet.example.org/room', meeting_notes: '<p>Decisions</p>' },
    { ...base, task_subtype: 'event', event_is_hybrid: true, event_max_attendees: 20, meeting_url: 'https://meet.example.org/event' },
    { ...base, task_subtype: 'project', project_deliverables: 'Community garden' },
  ] satisfies TaskSubtypeFields[])('creates $task_subtype with all details before onSaved', async fields => {
    const onSaved = vi.fn(task => {
      expect(mocks.savedRow).toMatchObject(fields);
      expect(task).toMatchObject(fields);
    });
    render(<CreateTaskModalHost open onClose={vi.fn()} onSaved={onSaved} />);
    const result = await submit(fields);
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(fields));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(result).toMatchObject(fields);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('includes edited category and notes in the saved row and callback', async () => {
    const oldTask = { id: 'task-id', title: 'Old', ...base } as any;
    mocks.savedRow = oldTask;
    const onSaved = vi.fn();
    render(<CreateTaskModalHost open onClose={vi.fn()} editTask={oldTask} onSaved={onSaved} />);
    const fields: TaskSubtypeFields = { ...base, task_subtype: 'meeting', meeting_notes: '<p>New notes</p>' };
    await submit(fields);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(fields));
    expect(mocks.savedRow).toMatchObject(fields);
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(fields));
  });

  it.each([false, true])('does not notify a refresh when the combined save fails (editing=%s)', async editing => {
    mocks.error = { message: 'Save failed' };
    const onSaved = vi.fn();
    render(<CreateTaskModalHost open onClose={vi.fn()} editTask={editing ? { id: 'task-id', ...base } as any : null} onSaved={onSaved} />);
    expect(await submit({ ...base, task_subtype: 'event' })).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });
});