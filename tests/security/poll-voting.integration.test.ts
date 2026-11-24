import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const ownerPath = process.env['SECURITY_TEST_OWNER_SESSION_FILE'];
const viewerPath = process.env['SECURITY_TEST_VIEWER_SESSION_FILE'];
describe.skipIf(!ownerPath || !viewerPath)('live poll privacy and mode locks', () => {
  let owner: SupabaseClient;
  let viewer: SupabaseClient;
  let guest: SupabaseClient;
  let viewerId = '';
  const secret = crypto.randomUUID();
  const open = crypto.randomUUID();
  const secretOption = crypto.randomUUID();
  const openOption = crypto.randomUUID();
  beforeAll(async () => {
    if (!ownerPath || !viewerPath) throw new Error('Two disposable sessions required');
    const env = loadEnv('development', process.cwd(), 'VITE_');
    const url = env['VITE_SUPABASE_URL'];
    const key = env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? env['VITE_SUPABASE_ANON_KEY'];
    if (!url || !key) throw new Error('Missing public config');
    function account(path: string) {
      const s = JSON.parse(readFileSync(path, 'utf8')).session;
      if (!/^agent-test\+[^@]+@example\.com$/.test(s?.user?.email ?? '')) throw new Error('Disposable accounts only');
      return s;
    }
    const a = account(ownerPath); const b = account(viewerPath);
    expect(a.user.id).not.toBe(b.user.id);
    viewerId = b.user.id;
    const client = (token?: string) => createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        else if (key.startsWith('sb_')) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
    owner = client(a.access_token); viewer = client(b.access_token); guest = client();
    expect((await owner.auth.getUser(a.access_token)).data.user?.id).toBe(a.user.id);
    expect((await viewer.auth.getUser(b.access_token)).data.user?.id).toBe(viewerId);
    expect((await owner.from('polls').insert([
      { id: secret, title: 'Teste voto secreto', created_by: a.user.id, verified_only: false },
      { id: open, title: 'Teste voto aberto', created_by: a.user.id, secret_vote: false, verified_only: false },
    ], { defaultToNull: false }).select('id')).error).toBeNull();
    expect((await owner.from('poll_options').insert([
      { id: secretOption, poll_id: secret, label: 'Escolha secreta', created_by: a.user.id },
      { id: openOption, poll_id: open, label: 'Escolha aberta', created_by: a.user.id },
    ])).error).toBeNull();
  });
  afterAll(async () => {
    if (owner) expect((await owner.from('polls').delete().in('id', [secret, open])).error).toBeNull();
  });
  it('defaults existing-style opinions to secret and locks open mode before any vote', async () => {
    expect((await owner.from('polls').select('secret_vote').eq('id', secret).single()).data?.secret_vote).toBe(true);
    expect((await owner.from('polls').update({ secret_vote: true }).eq('id', open)).error?.code).toBe('23514');
  });
  it('shows secret voter identity and totals but no other person’s choice, even to the creator', async () => {
    expect((await viewer.from('poll_votes').insert({ poll_id: secret, option_id: secretOption, user_id: viewerId })).error).toBeNull();
    const display = await owner.from('poll_vote_display').select('*').eq('poll_id', secret);
    expect(display.error).toBeNull();
    expect(display.data).toHaveLength(1);
    expect(display.data?.[0]?.user_id).toBe(viewerId);
    expect(display.data?.[0]?.option_id).toBeNull();
    expect(display.data?.[0]?.vote_counts?.[secretOption]).toBe(1);
    expect((await owner.from('poll_votes').select('*').eq('poll_id', secret)).data).toEqual([]);
    expect((await viewer.from('poll_votes').select('option_id').eq('poll_id', secret)).data?.[0]?.option_id).toBe(secretOption);
    expect((await guest.from('poll_votes').select('*').eq('poll_id', secret)).data).toEqual([]);
    expect((await owner.from('polls').update({ secret_vote: false }).eq('id', secret)).error?.code).toBe('23514');
  });
  it('shows each open voter’s choice to authorized readers and preserves mode on edits', async () => {
    expect((await viewer.from('poll_votes').insert({ poll_id: open, option_id: openOption, user_id: viewerId })).error).toBeNull();
    expect((await owner.from('poll_vote_display').select('user_id,option_id').eq('poll_id', open)).data).toEqual([{ user_id: viewerId, option_id: openOption }]);
    expect((await owner.from('polls').update({ title: 'Teste voto aberto editado', secret_vote: false }).eq('id', open)).error).toBeNull();
    expect((await owner.from('polls').update({ secret_vote: true }).eq('id', open)).error?.code).toBe('23514');
  });
});