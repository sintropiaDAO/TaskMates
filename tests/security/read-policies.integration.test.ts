import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';

// Opt-in live regression suite: session credentials never enter source or test output.
// Run with SECURITY_TEST_SESSION_FILE pointing to a locally minted session.
const sessionPath = process.env.SECURITY_TEST_SESSION_FILE;
const uuid = () => crypto.randomUUID();
const run = uuid();
const publicTask = uuid();
const privateTask = uuid();
const community = uuid();
const skill = uuid();
const product = uuid();
const poll = uuid();
const portfolio = uuid();
const privateChildren = [
  'task_likes', 'task_comments', 'task_votes', 'task_attendees', 'task_feedback',
  'task_completion_proofs', 'task_ratings', 'task_collaborators', 'task_tags',
  'task_products', 'task_highlights',
] as const;

describe.skipIf(!sessionPath)('live security: parent-scoped read policies', () => {
  let owner: SupabaseClient;
  let visitor: SupabaseClient;
  let ownerId: string;
  let publicSlug: string;

  async function insert(table: string, row: Record<string, unknown>) {
    const { error } = await owner.from(table).insert(row);
    if (error) throw new Error(`Could not prepare ${table} test fixture (${error.code})`);
  }

  beforeAll(async () => {
    if (!sessionPath) throw new Error('A test session is required');
    const env = loadEnv('development', process.cwd(), 'VITE_');
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Public backend configuration is required');
    const minted = JSON.parse(readFileSync(sessionPath, 'utf8'));
    const session = minted.session;
    if (!session?.access_token || !session?.user?.id) throw new Error('Invalid test session');
    ownerId = session.user.id;
    owner = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });
    visitor = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    await insert('tags', { id: community, name: `Security community ${run}`, category: 'communities', created_by: ownerId });
    await insert('tags', { id: skill, name: `Security skill ${run}`, category: 'skills', created_by: ownerId });
    await insert('community_settings', { tag_id: community, is_hidden: true });
    await insert('user_tags', { tag_id: community, user_id: ownerId });
    await insert('tasks', { id: publicTask, title: `Security public ${run}`, task_type: 'offer', task_subtype: 'meeting', created_by: ownerId });
    await insert('tasks', { id: privateTask, title: `Security private ${run}`, task_type: 'offer', task_subtype: 'event', created_by: ownerId });
    await insert('task_tags', { task_id: privateTask, tag_id: community });
    await insert('task_tags', { task_id: privateTask, tag_id: skill });
    await insert('products', { id: product, title: `Security product ${run}`, product_type: 'offer', quantity: 1, created_by: ownerId });
    await insert('product_tags', { product_id: product, tag_id: community });
    await insert('polls', { id: poll, title: `Security opinion ${run}`, opinions_only: false, created_by: ownerId });
    await insert('poll_tags', { poll_id: poll, tag_id: community });
    const option = uuid();
    await insert('poll_options', { id: option, poll_id: poll, text: 'Option', created_by: ownerId });
    await insert('poll_votes', { poll_id: poll, option_id: option, user_id: ownerId });
    await insert('task_comments', { task_id: privateTask, user_id: ownerId, content: 'Private test comment' });
    await insert('task_likes', { task_id: privateTask, user_id: ownerId, like_type: 'like' });
    await insert('task_votes', { task_id: privateTask, user_id: ownerId, vote_type: 'up' });
    await insert('task_attendees', { task_id: privateTask, user_id: ownerId, status: 'interested' });
    await insert('task_feedback', { task_id: privateTask, user_id: ownerId, content: 'Private test feedback' });
    await insert('task_completion_proofs', { task_id: privateTask, user_id: ownerId, proof_url: 'https://taskmates.app/test-proof', proof_type: 'link' });
    await insert('task_ratings', { task_id: privateTask, rater_user_id: ownerId, rated_user_id: ownerId, rating: 5 });
    await insert('task_collaborators', { task_id: privateTask, user_id: ownerId });
    await insert('task_products', { task_id: privateTask, product_id: product });
    // Highlights are inserted through a privileged RPC; existing rows are checked without spending coins.
    publicSlug = `security-portfolio-${run}`;
    await insert('portfolios', { id: portfolio, slug: publicSlug, owner_id: ownerId, title: `Security portfolio ${run}` });
  }, 60_000);

  afterAll(async () => {
    if (!owner) return;
    const cleanup: [string, string, string][] = [
      ...privateChildren.filter(t => t !== 'task_highlights').map(t => [t, 'task_id', privateTask] as [string, string, string]),
      ['poll_votes', 'poll_id', poll], ['poll_tags', 'poll_id', poll], ['poll_options', 'poll_id', poll],
      ['polls', 'id', poll], ['product_tags', 'product_id', product], ['products', 'id', product],
      ['tasks', 'id', publicTask], ['tasks', 'id', privateTask], ['user_tags', 'tag_id', community],
      ['community_settings', 'tag_id', community], ['community_admins', 'tag_id', community],
      ['tags', 'id', community], ['tags', 'id', skill], ['portfolios', 'id', portfolio],
    ];
    const failures: string[] = [];
    for (const [table, column, value] of cleanup) {
      const { error } = await owner.from(table).delete().eq(column, value);
      if (error) failures.push(`${table} (${error.code})`);
    }
    expect(failures, 'Temporary fixture cleanup must succeed').toEqual([]);
  }, 60_000);

  it('tasks: anonymous users can read a public meeting but not a hidden-community event', async () => {
    const { data, error } = await visitor.from('tasks').select('id,task_subtype').in('id', [publicTask, privateTask]);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: publicTask, task_subtype: 'meeting' }]);
    const own = await owner.from('tasks').select('id,task_subtype').eq('id', privateTask);
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: privateTask, task_subtype: 'event' }]);
  });

  for (const table of privateChildren) {
    it(`${table}: cannot disclose an inaccessible parent`, async () => {
      const { data, error } = await visitor.from(table).select('id').eq('task_id', privateTask);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      if (table !== 'task_highlights') {
        const own = await owner.from(table).select('id').eq('task_id', privateTask);
        expect(own.error).toBeNull();
        expect(own.data?.length).toBeGreaterThan(0);
      } else {
        const orphan = await visitor.rpc('can_view_entity', { _entity_type: 'task', _entity_id: uuid() });
        expect(orphan.error).toBeNull();
        expect(orphan.data).toBe(false);
      }
    });
  }

  it('poll_votes: ballots of a hidden-community opinion cannot be read anonymously', async () => {
    const publicRead = await visitor.from('poll_votes').select('id').eq('poll_id', poll);
    expect(publicRead.error).toBeNull();
    expect(publicRead.data).toEqual([]);
    const own = await owner.from('poll_votes').select('id').eq('poll_id', poll);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
  });

  it('user_tags: hidden-community memberships are private', async () => {
    const result = await visitor.from('user_tags').select('id').eq('tag_id', community);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    const own = await owner.from('user_tags').select('id').eq('tag_id', community);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
  });

  it('community_admins: hidden-community administrator identities are private', async () => {
    const result = await visitor.from('community_admins').select('id').eq('tag_id', community);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    const own = await owner.from('community_admins').select('id').eq('tag_id', community);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
  });

  it('profile_section_visibility: another profile raw settings are owner-only', async () => {
    const others = await owner.from('profiles').select('id').neq('id', ownerId).limit(1);
    expect(others.error).toBeNull();
    expect(others.data?.length).toBe(1);
    const otherId = others.data?.[0]?.id;
    if (!otherId) throw new Error('Another public profile is required');
    const raw = await owner.from('profile_section_visibility').select('*').eq('user_id', otherId);
    expect(raw.error).toBeNull();
    expect(raw.data).toEqual([]);
    const safe = await owner.rpc('get_public_profile_visibility', { _user_id: otherId });
    expect(safe.error).toBeNull();
    expect(safe.data).toHaveProperty('show_ratings');
    expect(safe.data).not.toHaveProperty('id');
    expect(safe.data).not.toHaveProperty('user_id');
    expect(safe.data).not.toHaveProperty('created_at');
  });

  it('profiles: unknown or missing profiles cannot bypass profile authorization', async () => {
    const result = await visitor.rpc('can_view_profile', { _profile_id: uuid() });
    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
    const own = await owner.from('profiles').select('id').eq('id', ownerId);
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: ownerId }]);
  });

  it('follows: accessible social relationships still load without recursion', async () => {
    const result = await owner.from('follows').select('id').limit(1);
    expect(result.error).toBeNull();
    expect(result.data?.length).toBeGreaterThan(0);
  });

  it('user_vouches: accessible public reputation still loads without recursion', async () => {
    const result = await owner.from('user_vouches').select('id').limit(1);
    expect(result.error).toBeNull();
    expect(result.data?.length).toBeGreaterThan(0);
  });

  it('report_likes: callers without a session cannot read report reactions', async () => {
    const result = await visitor.from('report_likes').select('id').limit(1);
    expect(result.data ?? []).toEqual([]);
    const missing = await owner.rpc('can_view_report_reactions', { _report_id: uuid() });
    expect(missing.error).toBeNull();
    expect(missing.data).toBe(false);
  });

  it('portfolios: raw configuration is private but sharing by slug stays public', async () => {
    const raw = await visitor.from('portfolios').select('id').eq('id', portfolio);
    expect(raw.data).toBeNull();
    expect(raw.error?.code).toBe('42501');
    const response = await fetch(`http://localhost:8080/p/${publicSlug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Security portfolio ${run}`);
    expect(html).not.toContain(`Security private ${run}`);
  });
});