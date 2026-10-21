import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>,
  errors: new Set<string>(),
}));

vi.mock('@/lib/supabase-server', () => ({
  adminClient: () => ({
    from: (table: string) => {
      let rows = state.rows[table] ?? [];
      let single = false;
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { rows = rows.filter(r => r[key] === value); return query; },
        in: (key: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[key])); return query; },
        gte: () => query,
        lte: () => query,
        not: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: () => { single = true; return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({
          data: single ? rows[0] ?? null : rows,
          error: state.errors.has(table) ? { code: 'TEST_ERROR' } : null,
        }).then(resolve),
      };
      return query;
    },
  }),
}));

import { buildPublicPortfolio } from '@/lib/portfolio.server';

describe('public portfolio privacy', () => {
  beforeEach(() => {
    state.errors.clear();
    state.rows = {
      portfolios: [{ id: 'portfolio', slug: 'report', owner_id: 'owner', title: 'Report', tag_ids: [] }],
      community_settings: [{ tag_id: 'hidden', is_hidden: true, logo_url: 'private-logo' }],
      profiles: [{ id: 'owner', full_name: 'Owner' }],
      tasks: [{ id: 'private-task' }, { id: 'public-task' }],
      task_tags: [{ task_id: 'private-task', tag_id: 'hidden' }],
      task_ratings: [
        { task_id: 'private-task', rated_user_id: 'owner', rating: 5, comment: 'Private testimonial', rater_user_id: 'owner' },
        { task_id: 'public-task', rated_user_id: 'owner', rating: 5, comment: 'Public testimonial', rater_user_id: 'owner' },
      ],
    };
  });

  it('excludes hidden-community testimonials while keeping public testimonials', async () => {
    const result = await buildPublicPortfolio('report');
    expect(result.testimonials?.map(r => r.comment)).toEqual(['Public testimonial']);
  });

  it('does not publish a portfolio linked to a hidden community or its branding', async () => {
    state.rows.portfolios[0].tag_id = 'hidden';
    const result = await buildPublicPortfolio('report');
    expect(result).toEqual({ found: false });
  });

  it('fails closed if hidden-community settings cannot be checked', async () => {
    state.errors.add('community_settings');
    await expect(buildPublicPortfolio('report')).rejects.toThrow('Could not verify portfolio privacy');
  });

  it('fails closed if testimonial parent tags cannot be checked', async () => {
    state.errors.add('task_tags');
    await expect(buildPublicPortfolio('report')).rejects.toThrow('Could not verify portfolio item privacy');
  });
});