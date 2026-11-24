import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const ownerPath = process.env['SECURITY_TEST_OWNER_SESSION_FILE'];
const viewerPath = process.env['SECURITY_TEST_VIEWER_SESSION_FILE'];
describe.skipIf(!ownerPath || !viewerPath)('live comment mention privacy', () => {
  let owner: SupabaseClient;
  let viewer: SupabaseClient;
  let ownerId = ''; let viewerId = ''; let username = ''; let ownerUsername = '';
  const task = crypto.randomUUID(); const poll = crypto.randomUUID(); const product = crypto.randomUUID(); const journey = crypto.randomUUID();
  const hiddenTag = crypto.randomUUID(); const hiddenTask = crypto.randomUUID();
  const commentIds: string[] = [];
  beforeAll(async () => {
    if (!ownerPath || !viewerPath) throw new Error('Disposable sessions required');
    const env = loadEnv('development', process.cwd(), 'VITE_');
    const url = env['VITE_SUPABASE_URL']; const key = env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Missing public config');
    const account = (path: string) => {
      const s = JSON.parse(readFileSync(path, 'utf8')).session;
      if (!/^agent-test\+[^@]+@example\.com$/.test(s?.user?.email ?? '')) throw new Error('Disposable accounts only');
      return s;
    };
    const a = account(ownerPath); const b = account(viewerPath);
    ownerId = a.user.id; viewerId = b.user.id;
    expect(ownerId).not.toBe(viewerId);
    const client = (token: string) => createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    owner = client(a.access_token); viewer = client(b.access_token);
    expect((await owner.auth.getUser(a.access_token)).data.user?.id).toBe(ownerId);
    expect((await viewer.auth.getUser(b.access_token)).data.user?.id).toBe(viewerId);
    username = (await viewer.from('profiles').select('username').eq('id', viewerId).single()).data?.username ?? '';
    ownerUsername = (await owner.from('profiles').select('username').eq('id', ownerId).single()).data?.username ?? '';
    expect(username.length).toBeGreaterThanOrEqual(3);
    expect((await owner.from('tasks').insert([{ id: task, title: 'Mention regression task', task_type: 'personal', created_by: ownerId }, { id: hiddenTask, title: 'Private mention regression', task_type: 'personal', created_by: ownerId }])).error).toBeNull();
    expect((await owner.from('polls').insert({ id: poll, title: 'Mention regression poll', created_by: ownerId })).error).toBeNull();
    expect((await owner.from('products').insert({ id: product, title: 'Mention regression product', product_type: 'offer', created_by: ownerId })).error).toBeNull();
    expect((await owner.from('journeys').insert({ id: journey, title: 'Mention regression journey', created_by: ownerId })).error).toBeNull();
    expect((await owner.from('tags').insert({ id: hiddenTag, name: 'Mention regression ' + hiddenTag.slice(0, 8), category: 'communities', created_by: ownerId })).error).toBeNull();
    expect((await owner.from('community_settings').upsert({ tag_id: hiddenTag, is_hidden: true }, { onConflict: 'tag_id' })).error).toBeNull();
    expect((await owner.from('community_settings').select('is_hidden').eq('tag_id', hiddenTag).single()).data?.is_hidden).toBe(true);
    expect((await owner.from('task_tags').insert({ task_id: hiddenTask, tag_id: hiddenTag })).error).toBeNull();
  });
  afterAll(async () => {
    if (!owner) return;
    await viewer.from('user_blocks').delete().eq('blocker_id', viewerId).eq('blocked_id', ownerId);
    await owner.from('tasks').delete().in('id', [task, hiddenTask]);
    await owner.from('polls').delete().eq('id', poll);
    await owner.from('products').delete().eq('id', product);
    await owner.from('journeys').delete().eq('id', journey);
    await owner.from('tags').delete().eq('id', hiddenTag);
  });
  for (const kind of ['task', 'poll', 'product', 'journey'] as const) {
    it(`${kind}: mentions notify once and link to the correct parent`, async () => {
      const id = crypto.randomUUID(); commentIds.push(id);
      const entity = { task, poll, product, journey }[kind];
      expect((await owner.from(`${kind}_comments`).insert({ id, [`${kind}_id`]: entity, user_id: ownerId, content: `Oi @${username} e @${username.toUpperCase()}!` })).error).toBeNull();
      const notices = await viewer.from('notifications').select('*').eq('source_comment_id', id);
      expect(notices.error).toBeNull(); expect(notices.data).toHaveLength(1);
      expect(notices.data?.[0]?.[`${kind}_id`]).toBe(entity);
      expect(notices.data?.[0]?.type).toBe(`${kind}_mention`);
    });
  }
  it('does not notify the author or treat email addresses as mentions', async () => {
    const id = crypto.randomUUID();
    expect((await owner.from('task_comments').insert({ id, task_id: task, user_id: ownerId, content: `@${ownerUsername} mail@${username}.com` })).error).toBeNull();
    expect((await owner.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
    expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
  });
  it('does not leak private-community items to mentioned non-members', async () => {
    const id = crypto.randomUUID();
    expect((await viewer.from('tasks').select('id').eq('id', hiddenTask)).data).toEqual([]);
    expect((await owner.from('task_comments').insert({ id, task_id: hiddenTask, user_id: ownerId, content: `@${username}` })).error).toBeNull();
    expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
  });
  it('does not notify across a block in either direction', async () => {
    expect((await viewer.from('user_blocks').insert({ blocker_id: viewerId, blocked_id: ownerId })).error).toBeNull();
    const id = crypto.randomUUID();
    expect((await owner.from('task_comments').insert({ id, task_id: task, user_id: ownerId, content: `@${username}` })).error).toBeNull();
    expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
    await viewer.from('user_blocks').delete().eq('blocker_id', viewerId).eq('blocked_id', ownerId);
  });
  it('does not notify someone blocked by the comment author', async () => {
    expect((await owner.from('user_blocks').insert({ blocker_id: ownerId, blocked_id: viewerId })).error).toBeNull();
    try {
      const id = crypto.randomUUID();
      expect((await owner.from('task_comments').insert({ id, task_id: task, user_id: ownerId, content: `@${username}` })).error).toBeNull();
      expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
    } finally { await owner.from('user_blocks').delete().eq('blocker_id', ownerId).eq('blocked_id', viewerId); }
  });
  it('cannot forge a comment on behalf of the mentioned user', async () => {
    const id = crypto.randomUUID();
    expect((await owner.from('task_comments').insert({ id, task_id: task, user_id: viewerId, content: `@${username}` })).error).not.toBeNull();
    expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
  });
  it('does not disclose journeys whose tag references are unavailable', async () => {
    expect((await owner.from('journeys').update({ tag_ids: [crypto.randomUUID()] }).eq('id', journey)).error).toBeNull();
    try {
      const id = crypto.randomUUID();
      expect((await viewer.from('journeys').select('id').eq('id', journey)).data).toEqual([]);
      expect((await owner.from('journey_comments').insert({ id, journey_id: journey, user_id: ownerId, content: `@${username}` })).error).toBeNull();
      expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
    } finally { await owner.from('journeys').update({ tag_ids: [] }).eq('id', journey); }
  });
  it('removes stale mention notices when the comment is deleted', async () => {
    const id = commentIds[0]; if (!id) throw new Error('Missing fixture');
    expect((await owner.from('task_comments').delete().eq('id', id)).error).toBeNull();
    expect((await viewer.from('notifications').select('id').eq('source_comment_id', id)).data).toEqual([]);
  });
});