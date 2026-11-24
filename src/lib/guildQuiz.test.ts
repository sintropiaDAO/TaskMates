import { describe, it, expect } from 'vitest';
import { GUILD_QUIZ, VOCATION_CATEGORIES, scoreAnswers, rankVocations, buildJourneySteps, occupationName } from './guildQuiz';
import { featuredTitle, occupationTitles } from './occupationTitles';

describe('guild quiz', () => {
  it('has 9 questions with 4 answers each', () => {
    expect(GUILD_QUIZ).toHaveLength(9);
    GUILD_QUIZ.forEach(q => expect(q.answers).toHaveLength(4));
  });
  it('covers every vocation in at least 4 answers', () => {
    for (const c of VOCATION_CATEGORIES) {
      const n = GUILD_QUIZ.flatMap(q => q.answers).filter(a => a.categories.includes(c)).length;
      expect(n, c).toBeGreaterThanOrEqual(4);
    }
  });
  it('picks leadership when leadership answers dominate', () => {
    const r = rankVocations(scoreAnswers([0, 0, 0, 0, 0, 1, 0, 0, 0]));
    expect(r[0]).toBe('leadership');
  });
  it('breaks ties toward the badge closest to its next level', () => {
    const s = scoreAnswers([]);
    s.consistency = 2; s.sociability = 2;
    expect(rankVocations(s, { consistency: 50, sociability: 3 })[0]).toBe('sociability');
  });
  it('builds tag-bound steps for skill vocations', () => {
    const steps = buildJourneySteps('habits', 'tag-1');
    expect(steps.every(s => s.action === 'follow_tag' || s.tag_ids?.includes('tag-1'))).toBe(true);
  });
  it('gives every vocation 2–5 steps', () => {
    VOCATION_CATEGORIES.forEach(c => { const n = buildJourneySteps(c, 't').length; expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(5); });
  });
  it('fills the tag in tag-bound occupation names', () => {
    expect(occupationName('communities', 'pt', 'feminine', 'Educação')).toBe('Guardiã da Vila Educação');
  });
});

describe('occupation titles', () => {
  const b = (category: string, level: number, earned_at = '2026-01-01', entity_name: string | null = null) => ({ category, level, entity_name, earned_at });
  it('gives no title without an earned badge', () => {
    expect(featuredTitle([b('consistency', 0)], 'pt')).toBeNull();
  });
  it('carries the badge level in the title', () => {
    expect(featuredTitle([b('consistency', 3)], 'pt')?.name).toBe('Monge Nv. 3');
  });
  it('features the highest level and keeps every earned title', () => {
    const list = [b('consistency', 2), b('leadership', 4), b('sociability', 1)];
    expect(occupationTitles(list, 'pt')).toHaveLength(3);
    expect(featuredTitle(list, 'pt', 'feminine')?.name).toBe('Capitã da Guilda Nv. 4');
  });
  it('breaks level ties with the most recent', () => {
    expect(featuredTitle([b('consistency', 2, '2026-01-01'), b('sociability', 2, '2026-03-01')], 'pt')?.category).toBe('sociability');
  });
});

import { unseenTitles } from './occupationTitles';
import { buildJourneySteps as build } from './guildQuiz';
describe('new title celebration', () => {
  const titles = occupationTitles([{ category: 'consistency', level: 2, entity_name: null, earned_at: '2026-01-01' }], 'pt');
  it('does not replay titles on the first check', () => expect(unseenTitles(titles, null)).toEqual([]));
  it('celebrates a level-up as a new title', () => expect(unseenTitles(titles, ['consistency::1'])).toHaveLength(1));
  it('stays quiet for already seen titles', () => expect(unseenTitles(titles, ['consistency::2'])).toEqual([]));
});
describe('journey language', () => {
  it('uses English step titles when the app is in English', () => expect(build('leadership', null, 'en')[0]?.title).toBe('Rally your guild: create a group task'));
});
