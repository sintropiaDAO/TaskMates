import { describe, expect, it } from 'vitest';
import { celebrationKey, enqueueCelebration, type CompletionCelebration } from './completion-celebration';

const task: CompletionCelebration = { kind: 'task', id: 'task-1' };
const journey: CompletionCelebration = { kind: 'journey', id: 'journey-1' };

describe('completion celebration queue', () => {
  it('retains task and journey completions in arrival order', () => {
    const queue = enqueueCelebration(enqueueCelebration([], task, new Set()), journey, new Set());
    expect(queue).toEqual([task, journey]);
  });
  it('does not enqueue a repeated pending completion', () => {
    expect(enqueueCelebration([journey], journey, new Set())).toEqual([journey]);
  });
  it('does not replay a celebration already shown in this session', () => {
    expect(enqueueCelebration([], task, new Set([celebrationKey(task)]))).toEqual([]);
  });
  it('keeps different item types separate even when their IDs match', () => {
    expect(enqueueCelebration([task], { kind: 'journey', id: task.id }, new Set())).toHaveLength(2);
  });
});