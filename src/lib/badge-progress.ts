import { LEVEL_THRESHOLDS } from '@/hooks/useBadges';

/** A visual projection of persisted badge metrics, not an award or level calculation. */
export function badgeProgress(level: number, metric: number) {
  const target = LEVEL_THRESHOLDS[level];
  if (target === undefined) return { target: null, percent: 100 };
  return { target, percent: Math.min(100, Math.max(0, metric / target * 100)) };
}