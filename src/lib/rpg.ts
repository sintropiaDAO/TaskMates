// RPG gamification rules: EXP sources, level curve and titles.
export const EXP_RULES = {
  questCompleted: 100,
  questCollaborated: 50,
  fiveStarRating: 50,
  itemCreated: 25,
} as const;

export function levelFromExp(exp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, exp) / 100)) + 1;
}

export function expForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

const TITLES: { min: number; pt: string; en: string }[] = [
  { min: 1, pt: 'Aprendiz', en: 'Apprentice' },
  { min: 3, pt: 'Explorador(a)', en: 'Explorer' },
  { min: 6, pt: 'Artesã(o)', en: 'Artisan' },
  { min: 10, pt: 'Guardiã(o)', en: 'Guardian' },
  { min: 15, pt: 'Mestre da Guilda', en: 'Guild Master' },
  { min: 25, pt: 'Lenda Regenerativa', en: 'Regenerative Legend' },
];

export function titleForLevel(level: number, lang: 'pt' | 'en'): string {
  let t = TITLES[0];
  for (const x of TITLES) if (level >= x.min) t = x;
  return t[lang];
}

export function questExpReward(task: { task_type?: string | null; allow_collaboration?: boolean | null }): number {
  return EXP_RULES.questCompleted + (task.allow_collaboration && task.task_type !== 'personal' ? EXP_RULES.questCollaborated : 0);
}
