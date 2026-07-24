
## Bug Fixes

### 1. Chat modal
- **Avatar → profile**: In `ChatHeader.tsx`, wrap the avatar/name of the counterpart (direct chat) with a click handler that navigates to `/profile/:userId` and closes the chat drawer. For group chats, avatar opens the members modal (current behavior).
- **Input hidden behind bottom nav on desktop**: In `Chat.tsx` the container uses `h-[calc(100vh-10rem)]` but `pb-20` on the outer wrapper isn't compensating on desktop. Adjust `ChatWindow`/`Chat.tsx` so the input row stays above `BottomNav` — reduce height calc and add `pb-safe` / ensure `ChatInput` sits inside the fixed-height flex column with `shrink-0`. Also review `ChatDrawer.tsx` for the same overflow issue.

### 2. Notifications
- **Some notifications don't navigate**: In `NotificationsPanel.tsx`, extend `handleNotificationClick` to cover missing types:
  - `message` / `new_message` → open Chat context with `conversation_id` stored on the notification (add `conversation_id` to notification metadata if not present; fall back to `/chat`).
  - `comment`, `comment_like`, `task_like`, `poll_like`, `product_like`, `rating`, `vouch`, `report_like`, `new_tag`, `task_completed` → route to the correct detail modal via `?task=`, `?poll=`, `?product=`, `?tag=` query params handled by `ItemDetailModalHost`.
  - Default: still mark as read but show a toast instead of silently doing nothing.
- **Bell → blank screen**: audit `NotificationsPanel` open/close for Radix pointer-events lock; ensure panel is not a nested `Dialog` inside another Dialog. Add a body cleanup on unmount (same pattern used for product delete). Verify the unread badge doesn't intercept clicks (already `pointer-events-none`, confirm still true).

### 3. Product deletion still freezes
- Root cause likely: `AlertDialog` sits inside `DialogContent` (Product modal). When we call `onClose()` before the AlertDialog fully unmounts, Radix leaves `pointer-events: none` on `<body>` on Edge.
- Fix: reorder — let AlertDialog close naturally (don't call `onClose()` first). Instead, perform delete, then close both dialogs sequentially with a `requestAnimationFrame` gap, and always run the body cleanup. Also add a global effect in `App.tsx` (or an existing mount) that observes `<body>` style and clears stuck `pointer-events: none` when no Radix overlay is present.

### 4. User search
- Remove the "Todas / Habilidades / Comunidades" tabs from `UserSearch.tsx`; make the search query users, tags (all categories) and items in a single combined result list.
- **Global search on dashboard**: add a search icon/input in `DashboardHeader.tsx` that opens a lightweight command/search modal. Queries: tags (name), tasks (title), products (title), polls (title), users (full_name/username). Clicking a result opens the corresponding detail modal or profile.

### 5. Poll history glitch
- In `PollHistorySection.tsx`, the flashing text is likely re-render caused by fetching inside a `useEffect` without stable deps or by animating text on each update. Memoize the history list, remove the `motion` re-animation on every re-render (set `initial={false}` after first mount), and guard fetch with an `isMounted` ref.

### 6. Task description number alignment
- In the TipTap-based description editor, ordered/unordered list numbers/bullets currently render outside the padded content area. Fix in `src/index.css`: set `.ProseMirror ol, .ProseMirror ul { padding-left: 1.5rem; }` and `list-style-position: outside;` with proper margin so numbers align with text baseline.

### 7. Share Poll
- `ShareItemButton` / poll share flow uses the local origin. Ensure poll sharing uses `publicUrl()` helper (from `src/lib/publicUrl.ts`) producing `https://taskmates.app/?poll={id}`. Verify `ItemDetailModalHost` reads `?poll=` param and opens `PollDetailModal`. Add the same for direct invite link and Web Share API fallback (copy to clipboard + toast).

## Files to edit

- `src/components/chat/ChatHeader.tsx` — avatar → profile
- `src/pages/Chat.tsx`, `src/components/chat/ChatDrawer.tsx` — input height/padding
- `src/components/dashboard/NotificationsPanel.tsx` — exhaustive routing + cleanup
- `src/App.tsx` — global pointer-events guard
- `src/components/products/ProductDetailModal.tsx` — delete sequencing
- `src/pages/UserSearch.tsx` — remove category tabs, unify results
- `src/components/dashboard/DashboardHeader.tsx` (+ new `GlobalSearchModal.tsx`) — global search
- `src/components/polls/PollHistorySection.tsx` — stop flash
- `src/index.css` — list alignment in description editor
- `src/components/common/ShareItemButton.tsx` (or poll-specific share) — use `publicUrl()`

## Verification

- Playwright: open chat, click avatar → verify `/profile/...`; scroll long chat on desktop → input visible.
- Click each notification type on a seeded account → verify navigation.
- Delete a product in Edge/Chrome → modal closes, page interactive.
- Search "Solarpunk" → community appears; global dashboard search returns tag.
- Open a poll from Minhas → no text flash in history.
- Type numbered list in task description → digits aligned.
- Share poll → link is `https://taskmates.app/?poll=...` and opens the poll modal.
