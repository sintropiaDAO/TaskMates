/** Presentation only: these events never award EXP or write completion/progress. */
export const COMPLETION_CELEBRATION_EVENT = 'taskmates:completion-celebration';

export interface CompletionReward {
  title: string;
  description?: string | null;
}

export interface CompletionCelebration {
  kind: 'task' | 'journey';
  id: string;
  title?: string;
  steps?: number;
  multiplier?: number;
  rewards?: CompletionReward[];
  rewardDelivered?: boolean;
}

export function celebrationKey(item: CompletionCelebration): string {
  return `${item.kind}:${item.id}`;
}

/** Keep simultaneous task/journey completions in order instead of dropping them. */
export function enqueueCelebration(
  queue: CompletionCelebration[],
  item: CompletionCelebration,
  seen: ReadonlySet<string>,
): CompletionCelebration[] {
  const key = celebrationKey(item);
  return seen.has(key) || queue.some(q => celebrationKey(q) === key) ? queue : [...queue, item];
}

export function dispatchCompletionCelebration(item: CompletionCelebration) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMPLETION_CELEBRATION_EVENT, { detail: item }));
}