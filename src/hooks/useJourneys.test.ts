import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JourneyStepInput } from '@/lib/journeys';

const { database } = vi.hoisted(() => ({ database: { from: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: database }));

import { createJourney } from './useJourneys';

describe('editing journeys preserves participant step progress', () => {
  const journeyId = 'journey-1';
  let steps: Record<string, unknown>[];
  let progress: { participant_id: string; step_id: string }[];
  let deletedIds: string[];
  let sequence: number;
  let failure: string | undefined;

  beforeEach(() => {
    sequence = 0;
    failure = undefined;
    deletedIds = [];
    steps = [
      { id: 'step-1', journey_id: journeyId, position: 1, action: 'create', item_kind: 'task' },
      { id: 'step-2', journey_id: journeyId, position: 2, action: 'follow_person', item_kind: 'person' },
    ];
    progress = [
      { participant_id: 'completed-person', step_id: 'step-1' },
      { participant_id: 'completed-person', step_id: 'step-2' },
      { participant_id: 'active-person', step_id: 'step-1' },
    ];
    database.from.mockReset();
    database.from.mockImplementation((table: string) => {
      let operation = '';
      let payload: Record<string, unknown> | Record<string, unknown>[] = {};
      const filters: [string, unknown][] = [];
      const query = {
        select: vi.fn(() => { operation = 'select'; return query; }),
        update: vi.fn((value) => { operation = 'update'; payload = value; return query; }),
        insert: vi.fn((value) => { operation = 'insert'; payload = value; return query; }),
        delete: vi.fn(() => { operation = 'delete'; return query; }),
        eq: vi.fn((key, value) => { filters.push([key, value]); return query; }),
        in: vi.fn((key, value) => { filters.push([key, value]); return query; }),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          return Promise.resolve().then(() => {
            if (`${table}:${operation}` === failure) return { data: null, error: new Error('Save failed') };
            if (table !== 'journey_steps') return { data: [], error: null };
            const matches = (row: Record<string, unknown>) => filters.every(([key, value]) =>
              Array.isArray(value) ? value.includes(row[key]) : row[key] === value);
            const matched = steps.filter(matches);
            if (operation === 'select') return { data: matched.map(s => ({ ...s })), error: null };
            if (operation === 'update') matched.forEach(row => Object.assign(row, payload));
            if (operation === 'insert') {
              for (const row of Array.isArray(payload) ? payload : [payload]) {
                steps.push({ ...row, id: row.id ?? `new-step-${++sequence}` });
              }
            }
            if (operation === 'delete') {
              const ids = matched.map(s => String(s.id));
              deletedIds.push(...ids);
              steps = steps.filter(s => !ids.includes(String(s.id)));
              // Simulate the real ON DELETE CASCADE, including completed participants.
              progress = progress.filter(p => !ids.includes(p.step_id));
            }
            return { data: null, error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    });
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    userId: 'owner', title: 'Corrected journey title', tag_ids: [], is_ordered: false,
    steps: steps.map(s => ({ ...s })) as unknown as JourneyStepInput[], rewards: [], ...overrides,
  });

  it('keeps all 2 completed steps and the active participant’s 1 step after a title edit', async () => {
    await createJourney(input(), journeyId);
    expect(progress.filter(p => p.participant_id === 'completed-person')).toHaveLength(2);
    expect(progress.filter(p => p.participant_id === 'active-person')).toHaveLength(1);
    expect(steps.map(s => s.id)).toEqual(['step-1', 'step-2']);
    expect(deletedIds).toEqual([]);
  });

  it('preserves step identity and progress when steps are renamed and reordered', async () => {
    const reordered = input().steps.reverse().map((s, index) => ({ ...s, title: `Renamed ${index}` }));
    await createJourney(input({ steps: reordered }), journeyId);
    expect(steps.find(s => s.id === 'step-1')).toMatchObject({ position: 2, title: 'Renamed 1' });
    expect(steps.find(s => s.id === 'step-2')).toMatchObject({ position: 1, title: 'Renamed 0' });
    expect(progress).toHaveLength(3);
    expect(deletedIds).toEqual([]);
  });

  it('inserts a new step without deleting progress on existing steps', async () => {
    await createJourney(input({ steps: [...input().steps, { action: 'comment' }] }), journeyId);
    expect(steps).toHaveLength(3);
    expect(progress).toHaveLength(3);
    expect(deletedIds).toEqual([]);
  });

  it('deletes only explicitly removed steps and keeps progress on retained steps', async () => {
    await createJourney(input({ steps: [input().steps[0]] }), journeyId);
    expect(deletedIds).toEqual(['step-2']);
    expect(steps.map(s => s.id)).toEqual(['step-1']);
    expect(progress).toEqual([
      { participant_id: 'completed-person', step_id: 'step-1' },
      { participant_id: 'active-person', step_id: 'step-1' },
    ]);
  });

  it('stops on a failed step read rather than guessing which steps to remove', async () => {
    failure = 'journey_steps:select';
    await expect(createJourney(input(), journeyId)).rejects.toThrow('Save failed');
    expect(deletedIds).toEqual([]);
    expect(progress).toHaveLength(3);
  });

  it('stops on a failed step update before deleting removed steps', async () => {
    failure = 'journey_steps:update';
    await expect(createJourney(input({ steps: [input().steps[0]] }), journeyId)).rejects.toThrow('Save failed');
    expect(deletedIds).toEqual([]);
    expect(progress).toHaveLength(3);
  });
});