// RPG gamification rules: EXP sources, level curve, titles and dynamic letter ranks.
export const EXP_RULES = {
  questCompleted: 10,
  questCollaborated: 5,
  fiveStarRating: 5,
  itemCreated: 2,
  eventAttended: 5,
} as const;

export function titleForRank(rank: RankLetter, lang: 'pt' | 'en'): string {
  return RANK_STYLES[rank].label[lang];
}

export function questExpReward(task: { task_type?: string | null; allow_collaboration?: boolean | null }): number {
  return EXP_RULES.questCompleted + (task.allow_collaboration && task.task_type !== 'personal' ? EXP_RULES.questCollaborated : 0);
}

// ---------- Dynamic ranks ----------
export type RankLetter = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export const RANKS: RankLetter[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

/** Initial floors (minimum EXP for each rank) used while the community is small. */
const BASE_FLOORS = [0, 20, 50, 100, 200, 400, 700, 1200, 2000];
/** Share of the SSS cutoff (10th best EXP) where each rank starts — pyramid-shaped so most people sit low/mid. */
const PCT_FLOORS = [0, 0.05, 0.12, 0.22, 0.36, 0.55, 0.75, 0.9, 1];

/** Rank floors scale with the 10th-best player's EXP once that passes the initial SSS floor; never drop below base floors. */
export function rankFloors(sssCutoff: number): number[] {
  if (sssCutoff <= BASE_FLOORS[8]) return BASE_FLOORS;
  return PCT_FLOORS.map((p, i) => Math.max(BASE_FLOORS[i], Math.round(p * sssCutoff)));
}

export function rankFromExp(exp: number, sssCutoff: number) {
  const floors = rankFloors(sssCutoff);
  let i = 0;
  for (let k = 0; k < floors.length; k++) if (exp >= floors[k]) i = k;
  // SSS also requires being within the top 10 (exp >= cutoff) once dynamic scaling is active
  if (i === 8 && sssCutoff > BASE_FLOORS[8] && exp < sssCutoff) i = 7;
  const next = i < 8 ? floors[i + 1] : null;
  return { rank: RANKS[i], index: i, floor: floors[i], next };
}

export const RANK_STYLES: Record<RankLetter, { badge: string; glow: string; label: { pt: string; en: string } }> = {
  F: { badge: 'from-stone-500 to-stone-700', glow: 'shadow-stone-500/40', label: { pt: 'Novato', en: 'Novice' } },
  E: { badge: 'from-amber-700 to-orange-900', glow: 'shadow-orange-700/40', label: { pt: 'Aprendiz', en: 'Apprentice' } },
  D: { badge: 'from-emerald-400 to-emerald-700', glow: 'shadow-emerald-500/50', label: { pt: 'Aventureiro', en: 'Adventurer' } },
  C: { badge: 'from-sky-400 to-blue-700', glow: 'shadow-sky-500/50', label: { pt: 'Veterano', en: 'Veteran' } },
  B: { badge: 'from-cyan-300 to-teal-600', glow: 'shadow-teal-400/50', label: { pt: 'Especialista', en: 'Specialist' } },
  A: { badge: 'from-yellow-300 to-amber-600', glow: 'shadow-amber-400/60', label: { pt: 'Herói', en: 'Hero' } },
  S: { badge: 'from-fuchsia-400 to-purple-700', glow: 'shadow-fuchsia-500/60', label: { pt: 'Lenda', en: 'Legend' } },
  SS: { badge: 'from-rose-400 via-red-500 to-purple-700', glow: 'shadow-rose-500/60', label: { pt: 'Mítico', en: 'Mythic' } },
  SSS: { badge: 'from-yellow-300 via-pink-500 to-indigo-600', glow: 'shadow-pink-500/70', label: { pt: 'Divino · Top 10', en: 'Divine · Top 10' } },
};
