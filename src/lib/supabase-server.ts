/**
 * Shared server-side Supabase helpers for TanStack server functions.
 * Server-only: imported inside createServerFn handlers.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

export function getSupabaseUrl(): string {
  const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
  if (!url) throw new Error("SUPABASE_URL not configured");
  return url;
}

export function getAnonKey(): string {
  const key =
    process.env['SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!key) throw new Error("SUPABASE_ANON_KEY not configured");
  return key;
}

export function getServiceRoleKey(): string {
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return key;
}

/** Service-role client — bypasses RLS. Never expose to the client. */
export function adminClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Authenticates the calling user from the request's Authorization header
 * (attached by the client middleware in src/start.ts).
 * Throws on missing/invalid token.
 */
export async function requireUserId(): Promise<{ userId: string; authHeader: string }> {
  const authHeader = getRequestHeader("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(getSupabaseUrl(), getAnonKey(), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || !sub) {
    throw new Error("Unauthorized");
  }
  return { userId: sub, authHeader };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
