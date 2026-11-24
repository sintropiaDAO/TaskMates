import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  guest: vi.fn(), admin: vi.fn(), resolveLink: vi.fn(), createClient: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseUrl: () => 'https://backend.invalid', getAnonKey: () => 'public-test-key',
  adminClient: () => ({ from: mocks.admin }),
}));
vi.mock('@/lib/link-preview.server', () => ({ resolveLinkPreview: mocks.resolveLink }));
vi.mock('@/lib/link-preview.functions', () => ({ getItemSharePreview: vi.fn() }));
vi.mock('@/pages/SharePage', () => ({ default: () => null }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));

import { buildItemSharePreview, type SharePreview, type ShareType } from '@/lib/share-preview.server';
import { Route } from '@/routes/share/$type.$id';
import { getItemSharePreview } from '@/lib/link-preview.functions';

const types = ['task', 'product', 'poll'] as const;
const id = 'c14a46c6-ad80-42f7-b616-ec85ac13493d';
const sensitive = { id, title: 'Secret orchard meeting', description: 'Private plans https://example.org/live', image_url: 'https://example.org/private.jpg' };
const empty: SharePreview = { found: false, private: false, title: null, description: null, image: null };

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), in: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

type Options = {
  loader: (input: { params: { type: string; id: string } }) => Promise<SharePreview | null>;
  head: (input: { params: { type: string; id: string }; loaderData: SharePreview | null }) => {
    meta: Array<{ title?: string; name?: string; property?: string; content?: string }>;
  };
};
const options = Route.options as unknown as Options;
function metadata(type: ShareType, preview: SharePreview | null) {
  return options.head({ params: { type, id }, loaderData: preview }).meta;
}
function content(meta: ReturnType<typeof metadata>, key: string) {
  return meta.find(entry => entry.name === key || entry.property === key)?.content;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockReturnValue({ from: mocks.guest });
  mocks.guest.mockImplementation(() => query(sensitive));
  mocks.admin.mockImplementation(() => query([]));
  mocks.resolveLink.mockResolvedValue({ image_url: 'https://example.org/unfurled.jpg' });
});

describe.each(types)('%s share previews and route metadata', type => {
  // The builder must trust the guest query, never an elevated or member read.
  it.each(['hidden community', 'blocked/private-profile item', 'missing item'])('does not recover a guest-denied %s through admin reads', async () => {
    mocks.guest.mockImplementation(() => query(null));
    const result = await buildItemSharePreview(type, id);
    expect(result).toEqual(empty);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.resolveLink).not.toHaveBeenCalled();
    expect(mocks.createClient).toHaveBeenCalledWith('https://backend.invalid', 'public-test-key', {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const meta = metadata(type, result);
    expect(JSON.stringify(meta)).not.toContain(sensitive.title);
    expect(JSON.stringify(meta)).not.toContain(sensitive.description);
    expect(JSON.stringify(meta)).not.toContain(sensitive.image_url);
    expect(content(meta, 'og:image')).toBe('https://taskmates.app/og-default.jpg');
    expect(content(meta, 'twitter:image')).toBe(content(meta, 'og:image'));
  });

  it('fails closed on a guest read error, even if the response also contains data', async () => {
    mocks.guest.mockImplementation(() => query(sensitive, { code: '42501' }));
    expect(await buildItemSharePreview(type, id)).toEqual(empty);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it('does not expose any fields when all community tags are hidden, even alongside skill tags', async () => {
    mocks.admin.mockImplementation((table: string) => query(table === 'tags'
      ? [{ id: 'hidden', category: 'communities' }, { id: 'skill', category: 'skills' }]
      : table === 'community_settings' ? [{ tag_id: 'hidden', is_hidden: true }]
        : [{ tag_id: 'hidden' }, { tag_id: 'skill' }]));
    const preview = await buildItemSharePreview(type, id);
    expect(preview).toEqual({ ...empty, found: true, private: true });
    expect(mocks.resolveLink).not.toHaveBeenCalled();
    // Also guard against stale/sensitive values arriving with a private marker.
    const meta = metadata(type, { ...preview, title: sensitive.title, description: sensitive.description, image: sensitive.image_url });
    expect(JSON.stringify(meta)).not.toContain('Secret orchard');
    expect(JSON.stringify(meta)).not.toContain('Private plans');
    expect(JSON.stringify(meta)).not.toContain('private.jpg');
  });

  it('keeps publicly accessible items linked to at least one open community', async () => {
    mocks.admin.mockImplementation((table: string) => query(table === 'tags'
      ? [{ id: 'hidden', category: 'communities' }, { id: 'open', category: 'communities' }]
      : table === 'community_settings' ? [{ tag_id: 'hidden', is_hidden: true }, { tag_id: 'open', is_hidden: false }]
        : [{ tag_id: 'hidden' }, { tag_id: 'open' }]));
    expect(await buildItemSharePreview(type, id)).toMatchObject({ found: true, private: false, title: sensitive.title });
  });

  it('publishes the public title, plain description and the same cover in OG and Twitter', async () => {
    mocks.guest.mockImplementation(() => query({ ...sensitive, description: '<p>Restore &amp; nurture&nbsp;life</p>' }));
    const preview = await buildItemSharePreview(type, id);
    expect(preview.description).toBe('Restore & nurture life');
    const meta = metadata(type, preview);
    expect(content(meta, 'og:title')).toContain(sensitive.title);
    expect(content(meta, 'twitter:title')).toBe(content(meta, 'og:title'));
    expect(content(meta, 'description')).toBe(preview.description);
    expect(content(meta, 'og:description')).toBe(preview.description);
    expect(content(meta, 'twitter:description')).toBe(preview.description);
    expect(content(meta, 'og:image')).toBe(sensitive.image_url);
    expect(content(meta, 'twitter:image')).toBe(sensitive.image_url);
    expect(content(meta, 'og:url')).toBe(`https://taskmates.app/share/${type}/${id}`);
    expect(mocks.resolveLink).not.toHaveBeenCalled();
  });

  it('unfurls a missing cover only after the item is guest-readable', async () => {
    mocks.guest.mockImplementation(() => query({ ...sensitive, image_url: null }));
    const preview = await buildItemSharePreview(type, id);
    expect(mocks.resolveLink).toHaveBeenCalledExactlyOnceWith('https://example.org/live');
    expect(preview.image).toBe('https://example.org/unfurled.jpg');
  });

  it('uses generic metadata when the public loader fails', async () => {
    vi.mocked(getItemSharePreview).mockRejectedValueOnce(new Error('Unavailable'));
    const preview = await options.loader({ params: { type, id } });
    expect(preview).toBeNull();
    const meta = metadata(type, preview);
    expect(content(meta, 'og:image')).toBe('https://taskmates.app/og-default.jpg');
    expect(JSON.stringify(meta)).not.toContain(sensitive.title);
  });
});

it('does not query a preview for unsupported share types', async () => {
  expect(await options.loader({ params: { type: 'profile', id } })).toBeNull();
  expect(getItemSharePreview).not.toHaveBeenCalled();
});
