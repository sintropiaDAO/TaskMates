export const JOURNEY_PROGRESS_EVENT = 'taskmates:journey-progress';

export function notifyJourneyProgress(userId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(JOURNEY_PROGRESS_EVENT, { detail: { userId } }));
  }
}