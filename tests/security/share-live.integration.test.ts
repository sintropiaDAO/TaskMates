import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { loadEnv } from "vite";
import { JSDOM } from "jsdom";

// Dedicated disposable accounts only; never commit sessions or print tokens.
const ownerPath = process.env["SECURITY_TEST_OWNER_SESSION_FILE"];
const viewerPath = process.env["SECURITY_TEST_VIEWER_SESSION_FILE"];
const origin = process.env["SECURITY_TEST_APP_URL"] ?? "http://localhost:8080";
const types = ["task", "product", "poll"] as const;
const tables = { task: "tasks", product: "products", poll: "polls" };
const joins = { task: "task_tags", product: "product_tags", poll: "poll_tags" };
const keys = { task: "task_id", product: "product_id", poll: "poll_id" };
const run = crypto.randomUUID();
const hiddenTag = crypto.randomUUID();
const skillTag = crypto.randomUUID();
const openTag = crypto.randomUUID();
const items = types.map((type) => ({
  type,
  publicId: crypto.randomUUID(),
  privateId: crypto.randomUUID(),
}));

describe.skipIf(!ownerPath || !viewerPath)(
  "live /share access and metadata",
  () => {
    let owner: SupabaseClient;
    let viewer: SupabaseClient;
    let guest: SupabaseClient;
    let ownerId = "";
    let viewerId = "";
    let viewerToken = "";
    let originalVisibility: Record<string, unknown> | null = null;

    async function insert(table: string, row: Record<string, unknown>) {
      const result = await owner.from(table).insert(row);
      if (result.error)
        throw new Error(`Could not prepare ${table} (${result.error.code})`);
    }
    async function assertRead(
      client: SupabaseClient,
      table: string,
      id: string,
      allowed: boolean,
    ) {
      const result = await client
        .from(table)
        .select("id,title,description,image_url")
        .eq("id", id)
        .maybeSingle();
      expect(result.error).toBeNull();
      if (allowed) expect(result.data?.id).toBe(id);
      else expect(result.data).toBeNull();
    }
    async function removeBlock() {
      const result = await owner
        .from("user_blocks")
        .delete()
        .eq("blocker_id", ownerId)
        .eq("blocked_id", viewerId);
      expect(result.error).toBeNull();
    }
    // A bearer-bearing SSR request is not a hydrated browser sign-in. These
    // requests prove the public loader does not personalize preview metadata.
    async function safeHead(
      type: string,
      id: string,
      withViewerBearer: boolean,
    ) {
      const response = await fetch(`${origin}/share/${type}/${id}`, {
        headers: withViewerBearer
          ? { Authorization: `Bearer ${viewerToken}` }
          : {},
      });
      expect(response.status).toBe(200);
      const html = await response.text();
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
      expect(head).toBeDefined();
      const document = new JSDOM(html).window.document;
      const metadata: Record<string, string | null> = { title: document.title };
      for (const key of [
        "description",
        "og:title",
        "og:description",
        "og:image",
        "twitter:title",
        "twitter:description",
        "twitter:image",
      ]) {
        metadata[key] =
          document
            .querySelector(`meta[name="${key}"],meta[property="${key}"]`)
            ?.getAttribute("content") ?? null;
      }
      return { head: head ?? "", html, metadata };
    }

    beforeAll(async () => {
      if (!ownerPath || !viewerPath)
        throw new Error("Two dedicated test sessions are required");
      const env = loadEnv("development", process.cwd(), "VITE_");
      const url =
        process.env["SECURITY_TEST_BACKEND_URL"] ?? env["VITE_SUPABASE_URL"];
      const key =
        env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_ANON_KEY"];
      if (!url || !key)
        throw new Error("Public backend configuration is required");
      function account(path: string) {
        const parsed = JSON.parse(readFileSync(path, "utf8"));
        const session = parsed.session;
        if (
          !session?.access_token ||
          !session?.user?.id ||
          !/^agent-test\+[^@]+@example\.com$/.test(session.user.email ?? "")
        ) {
          throw new Error(
            "Use a session minted with --create-test-user, not a real account",
          );
        }
        return {
          id: session.user.id as string,
          token: session.access_token as string,
        };
      }
      const a = account(ownerPath);
      const b = account(viewerPath);
      if (a.id === b.id)
        throw new Error("Owner and viewer must be different accounts");
      ownerId = a.id;
      viewerId = b.id;
      viewerToken = b.token;
      function client(token?: string) {
        return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (token) headers.set("Authorization", `Bearer ${token}`);
              else if (key.startsWith("sb_")) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });
      }
      owner = client(a.token);
      viewer = client(b.token);
      guest = client();
      // Confirm identities without logging sessions.
      expect((await owner.auth.getUser(a.token)).data.user?.id).toBe(ownerId);
      expect((await viewer.auth.getUser(b.token)).data.user?.id).toBe(viewerId);
      await insert("tags", {
        id: hiddenTag,
        name: `Share private ${run}`,
        category: "communities",
        created_by: ownerId,
      });
      await insert("tags", {
        id: skillTag,
        name: `Share skill ${run}`,
        category: "skills",
        created_by: ownerId,
      });
      await insert("community_settings", {
        tag_id: hiddenTag,
        is_hidden: true,
      });
      await insert("tags", {
        id: openTag,
        name: `Share open ${run}`,
        category: "communities",
        created_by: ownerId,
      });
      await insert("community_settings", { tag_id: openTag, is_hidden: false });
      await insert("user_tags", { user_id: ownerId, tag_id: hiddenTag });
      const original = await owner
        .from("profile_section_visibility")
        .select("show_recent_activity,show_my_action_plan")
        .eq("user_id", ownerId)
        .maybeSingle();
      expect(original.error).toBeNull();
      originalVisibility = original.data ?? {
        show_recent_activity: true,
        show_my_action_plan: false,
      };
      const visibility = await owner.from("profile_section_visibility").upsert(
        {
          user_id: ownerId,
          show_recent_activity: false,
          show_my_action_plan: false,
        },
        { onConflict: "user_id" },
      );
      expect(visibility.error).toBeNull();
      for (const { type, publicId, privateId } of items) {
        for (const [id, privacy] of [
          [publicId, "public"],
          [privateId, "secret"],
        ] as const) {
          await insert(tables[type], {
            id,
            created_by: ownerId,
            title: `Share ${privacy} ${type} ${run}`,
            description: `Description ${privacy} ${type} ${run}`,
            image_url: `https://taskmates.app/test-${privacy}-${run}.jpg`,
            ...(type === "task" ? { task_type: "offer" } : {}),
            ...(type === "product"
              ? { product_type: "offer", quantity: 1 }
              : {}),
          });
        }
        await insert(joins[type], {
          [keys[type]]: privateId,
          tag_id: hiddenTag,
        });
        await insert(joins[type], {
          [keys[type]]: privateId,
          tag_id: skillTag,
        });
      }
    }, 60_000);

    beforeEach(async () => {
      // Each case starts as an unrelated viewer; no test depends on another
      // case's accepted invite or block remaining in place.
      await removeBlock();
      const unblock = await viewer
        .from("user_blocks")
        .delete()
        .eq("blocker_id", viewerId)
        .eq("blocked_id", ownerId);
      expect(unblock.error).toBeNull();
      const leave = await viewer
        .from("user_tags")
        .delete()
        .eq("user_id", viewerId)
        .eq("tag_id", hiddenTag);
      expect(leave.error).toBeNull();
      const invites = await owner
        .from("community_invites")
        .delete()
        .eq("tag_id", hiddenTag)
        .eq("invited_user_id", viewerId);
      expect(invites.error).toBeNull();
    });

    afterAll(async () => {
      if (!owner) return;
      const cleanup: Array<[string, string, unknown]> = [
        ["user_blocks", "blocker_id", ownerId],
        ["community_invites", "tag_id", hiddenTag],
        ["user_tags", "tag_id", hiddenTag],
        ...items.flatMap(
          ({ type, publicId, privateId }): Array<[string, string, unknown]> => [
            [joins[type], keys[type], privateId],
            [tables[type], "id", privateId],
            [tables[type], "id", publicId],
          ],
        ),
        ["community_settings", "tag_id", hiddenTag],
        ["community_admins", "tag_id", hiddenTag],
        ["community_settings", "tag_id", openTag],
        ["community_admins", "tag_id", openTag],
        ["tags", "id", openTag],
        ["tags", "id", hiddenTag],
        ["tags", "id", skillTag],
      ];
      const failed: string[] = [];
      for (const [table, column, value] of cleanup) {
        const result = await owner.from(table).delete().eq(column, value);
        if (result.error) failed.push(`${table} (${result.error.code})`);
      }
      if (originalVisibility) {
        const restored = await owner
          .from("profile_section_visibility")
          .update(originalVisibility)
          .eq("user_id", ownerId);
        if (restored.error)
          failed.push(`profile visibility (${restored.error.code})`);
      }
      for (const { type, publicId, privateId } of items) {
        const remaining = await owner
          .from(tables[type])
          .select("id")
          .in("id", [publicId, privateId]);
        expect(remaining.error).toBeNull();
        expect(
          remaining.data,
          "Item cleanup must remove rows, not merely return no error",
        ).toEqual([]);
      }
      expect(failed, "All isolated fixtures must be removed").toEqual([]);
    }, 60_000);

    for (const { type, publicId, privateId } of items) {
      it(`${type}: guests and non-members can read only public items; owners keep private access`, async () => {
        await assertRead(guest, tables[type], publicId, true);
        await assertRead(viewer, tables[type], publicId, true);
        await assertRead(guest, tables[type], privateId, false);
        await assertRead(viewer, tables[type], privateId, false);
        await assertRead(owner, tables[type], privateId, true);
      });
      it(`${type}: SSR with or without a viewer bearer uses guest-safe metadata and never serializes hidden item fields`, async () => {
        const baseline = await safeHead(type, privateId, false);
        for (const withViewerBearer of [false, true]) {
          const { head, html, metadata } = await safeHead(
            type,
            privateId,
            withViewerBearer,
          );
          expect(metadata).toEqual(baseline.metadata);
          expect(head).toContain("https://taskmates.app/og-default.jpg");
          expect(html).not.toContain(`Share secret ${type} ${run}`);
          expect(html).not.toContain(`Description secret ${type} ${run}`);
          expect(html).not.toContain(`test-secret-${run}.jpg`);
          const publicPage = await safeHead(type, publicId, withViewerBearer);
          const title = `Share public ${type} ${run} · ${{ task: "Tarefa", product: "Produto", poll: "Opinião" }[type]} no TaskMates`;
          expect(publicPage.metadata).toEqual({
            title,
            "og:title": title,
            "twitter:title": title,
            description: `Description public ${type} ${run}`,
            "og:description": `Description public ${type} ${run}`,
            "twitter:description": `Description public ${type} ${run}`,
            "og:image": `https://taskmates.app/test-public-${run}.jpg`,
            "twitter:image": `https://taskmates.app/test-public-${run}.jpg`,
          });
        }
      }, 30_000);

      it(`${type}: adding an open community makes a hidden-community item public, including its preview`, async () => {
        await insert(joins[type], { [keys[type]]: privateId, tag_id: openTag });
        try {
          await assertRead(guest, tables[type], privateId, true);
          await assertRead(viewer, tables[type], privateId, true);
          const page = await safeHead(type, privateId, false);
          expect(page.metadata["og:title"]).toContain(
            `Share secret ${type} ${run}`,
          );
          expect(page.metadata["og:image"]).toBe(
            `https://taskmates.app/test-secret-${run}.jpg`,
          );
          expect(page.metadata["twitter:image"]).toBe(
            page.metadata["og:image"],
          );
        } finally {
          const removed = await owner
            .from(joins[type])
            .delete()
            .eq(keys[type], privateId)
            .eq("tag_id", openTag);
          expect(removed.error).toBeNull();
        }
      }, 30_000);
    }

    it.each(["pending", "accepted", "rejected"])(
      "%s invite follows can_view_tag exactly; previews remain guest-only",
      async (status) => {
        await insert("community_invites", {
          tag_id: hiddenTag,
          invited_user_id: viewerId,
          invited_by: ownerId,
        });
        if (status !== "pending") {
          const changed = await viewer
            .from("community_invites")
            .update({ status })
            .eq("tag_id", hiddenTag)
            .eq("invited_user_id", viewerId)
            .select("status");
          expect(changed.error).toBeNull();
          expect(changed.data).toEqual([{ status }]);
        }
        for (const { type, privateId } of items) {
          await assertRead(
            viewer,
            tables[type],
            privateId,
            status !== "rejected",
          );
          await assertRead(guest, tables[type], privateId, false);
          const { html } = await safeHead(type, privateId, true);
          expect(html).not.toContain(`Share secret ${type} ${run}`);
        }
      },
      30_000,
    );

    it("blocks override community membership and deny profiles and all shared item types in both directions", async () => {
      await insert("community_invites", {
        tag_id: hiddenTag,
        invited_user_id: viewerId,
        invited_by: ownerId,
      });
      const joined = await viewer
        .from("user_tags")
        .insert({ user_id: viewerId, tag_id: hiddenTag });
      expect(joined.error).toBeNull();
      for (const { type, privateId } of items)
        await assertRead(viewer, tables[type], privateId, true);
      await insert("user_blocks", {
        blocker_id: ownerId,
        blocked_id: viewerId,
      });
      try {
        for (const { type, publicId, privateId } of items) {
          await assertRead(viewer, tables[type], publicId, false);
          await assertRead(viewer, tables[type], privateId, false);
          await assertRead(owner, tables[type], privateId, true);
          const guestPreview = await safeHead(type, publicId, false);
          const blockedRequestPreview = await safeHead(type, publicId, true);
          expect(blockedRequestPreview.metadata).toEqual(guestPreview.metadata);
          expect(blockedRequestPreview.metadata["og:title"]).toContain(
            `Share public ${type} ${run}`,
          );
          expect(blockedRequestPreview.metadata["og:image"]).toBe(
            `https://taskmates.app/test-public-${run}.jpg`,
          );
        }
        const blocked = await viewer
          .from("public_profiles")
          .select("id,full_name,avatar_url")
          .eq("id", ownerId);
        expect(blocked.error).toBeNull();
        expect(blocked.data).toEqual([]);
        for (const [client, target] of [
          [viewer, ownerId],
          [owner, viewerId],
        ] as const) {
          const access = await client.rpc("can_view_profile", {
            _profile_id: target,
          });
          expect(access.error).toBeNull();
          expect(access.data).toBe(false);
        }
        const flags = await viewer.rpc("get_public_profile_visibility", {
          _user_id: ownerId,
        });
        expect(flags.error).toBeNull();
        expect(flags.data).toBeNull();
      } finally {
        await removeBlock();
      }
    }, 30_000);

    it("community membership alone grants private reads after the invite is removed; preview remains generic", async () => {
      await insert("community_invites", {
        tag_id: hiddenTag,
        invited_user_id: viewerId,
        invited_by: ownerId,
      });
      const joined = await viewer
        .from("user_tags")
        .insert({ user_id: viewerId, tag_id: hiddenTag });
      expect(joined.error).toBeNull();
      const removed = await owner
        .from("community_invites")
        .delete()
        .eq("tag_id", hiddenTag)
        .eq("invited_user_id", viewerId);
      expect(removed.error).toBeNull();
      for (const { type, privateId } of items) {
        await assertRead(viewer, tables[type], privateId, true);
        await assertRead(guest, tables[type], privateId, false);
        const preview = await safeHead(type, privateId, true);
        expect(preview.metadata["og:image"]).toBe(
          "https://taskmates.app/og-default.jpg",
        );
        expect(preview.html).not.toContain(`Share secret ${type} ${run}`);
      }
    }, 30_000);

    it("raw profile settings remain owner-only, guests cannot read creator profiles, and public flags honor hidden sections", async () => {
      const own = await owner
        .from("profile_section_visibility")
        .select("user_id,show_recent_activity")
        .eq("user_id", ownerId);
      expect(own.error).toBeNull();
      expect(own.data).toEqual([
        { user_id: ownerId, show_recent_activity: false },
      ]);
      for (const client of [guest, viewer]) {
        const raw = await client
          .from("profile_section_visibility")
          .select("*")
          .eq("user_id", ownerId);
        // A policy-filtered empty result or an explicit permission denial
        // is valid; network/schema failures must not masquerade as privacy.
        expect([null, "42501"]).toContain(raw.error?.code ?? null);
        if (client === viewer) expect(raw.error).toBeNull();
        expect(raw.data ?? []).toEqual([]);
      }
      const guestProfile = await guest
        .from("public_profiles")
        .select("id,full_name,avatar_url")
        .eq("id", ownerId);
      expect([null, "42501"]).toContain(guestProfile.error?.code ?? null);
      expect(guestProfile.data ?? []).toEqual([]);
      const accessibleProfile = await viewer
        .from("public_profiles")
        .select("id")
        .eq("id", ownerId);
      expect(accessibleProfile.error).toBeNull();
      expect(accessibleProfile.data).toEqual([{ id: ownerId }]);
      // Section toggles are not a private-account switch: item access and
      // guest-safe OG/Twitter previews stay public with these flags disabled.
      for (const { type, publicId } of items) {
        await assertRead(guest, tables[type], publicId, true);
        await assertRead(viewer, tables[type], publicId, true);
      }
      const flags = await viewer.rpc("get_public_profile_visibility", {
        _user_id: ownerId,
      });
      expect(flags.error).toBeNull();
      expect(flags.data).toMatchObject({
        show_recent_activity: false,
        show_my_action_plan: false,
        show_ratings: true,
      });
      for (const key of ["id", "user_id", "created_at", "updated_at"])
        expect(flags.data).not.toHaveProperty(key);
    });

    it("a viewer-initiated block also denies shared items without affecting the owner or guest public reads", async () => {
      const block = await viewer
        .from("user_blocks")
        .insert({ blocker_id: viewerId, blocked_id: ownerId });
      expect(block.error).toBeNull();
      try {
        for (const { type, publicId, privateId } of items) {
          await assertRead(viewer, tables[type], publicId, false);
          await assertRead(viewer, tables[type], privateId, false);
          await assertRead(owner, tables[type], privateId, true);
          await assertRead(guest, tables[type], publicId, true);
        }
      } finally {
        const removed = await viewer
          .from("user_blocks")
          .delete()
          .eq("blocker_id", viewerId)
          .eq("blocked_id", ownerId);
        expect(removed.error).toBeNull();
      }
    });
  },
);
