import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import type { PublicJourneyPreview } from './journey-preview';

export const getPublicJourneyPreview = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PublicJourneyPreview | null> => {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
    if (!url || !key) return null;
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: preview, error } = await client.rpc('get_public_journey_preview', { _journey_id: data.id });
    if (error || !preview || typeof preview !== 'object' || Array.isArray(preview)) return null;
    return preview as unknown as PublicJourneyPreview;
  });