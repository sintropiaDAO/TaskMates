# Shared-link privacy regressions

Run the offline page, loader, and preview regression tests:

```sh
bun run test:share
```

The live suite is explicitly skipped unless both session files are provided.
It exercises the deployed database read policies and the local app's real SSR
responses, rather than reimplementing authorization in a mock.

## Live tests

Mint **two different disposable accounts** with `lovable auth-session --json
--create-test-user`, copying the first session file to a private temporary
location before minting the second. Keep both files outside the repository,
restrict access to them, and never print their contents. Only sessions whose
user email follows the CLI's temporary-test-account pattern are accepted.

With the app running on localhost:8080:

```sh
SECURITY_TEST_OWNER_SESSION_FILE=/private/temp/owner-session.json \
SECURITY_TEST_VIEWER_SESSION_FILE=/private/temp/viewer-session.json \
bun run test:share
```

Optional settings:

- `SECURITY_TEST_APP_URL`: app origin (default `http://localhost:8080`).
- `SECURITY_TEST_BACKEND_URL`: direct backend address when the preview proxy
  cannot accept a test session. The public key comes from existing Vite config.

The live suite verifies both account identities before creating uniquely named
tasks, products, polls, a hidden community, an invite, a skill tag, and profile
visibility settings. It cleans up fixtures in `afterAll`, including after
assertion failures, and restores the original profile display flags instead of
deleting account settings; block tests also remove their blocks in `finally`. Account
deletion is handled by the CLI's temporary-account lifecycle. Never run against
normal accounts or terminate the process before cleanup finishes.

## Coverage and privacy semantics

- Guests and signed-in non-members cannot read hidden-community items, even
  when those items also have a skill tag. Owners and accepted invitees can.
- Blocks deny item/profile reads in either direction, even for community
  members, while owners retain their own content.
- Raw profile settings are owner-only. Other authorized users receive only
  effective display flags; blocked users receive no flags. Guests cannot read
  creator profiles. Hiding a profile section is **not** a global private-account
  switch and does not by itself hide otherwise public shared items.
- Preview reads always use the guest client, never a member's session or an
  elevated recovery read. Hidden item titles, descriptions, and covers cannot
  appear in SSR HTML, serialized loader data, or OG/Twitter metadata—even when
  the request carries a signed-in member's bearer header.
- Public content has the same public-safe OG/Twitter metadata for everyone;
  blocking a signed-in viewer does not make a publicly available guest preview
  private. Signed-in item access is checked independently by database policies.
- Guest errors/missing items and loader errors fail closed. Private/not-found
  metadata uses the generic image. Public items retain their real title,
  description, and cover, with external unfurling only after guest authorization.

The page tests mock only database outcomes and session/navigation boundaries;
they do not claim to test database policies. The separate live suite supplies
that coverage across all three share types.
