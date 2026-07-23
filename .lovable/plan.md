
# Dashboard & modal refinements

Split into 8 focused fixes. All are frontend-only except one small poll behavior default (`opinions_only` default).

## 1. Feed action buttons (upvote/downvote) freeze
- Symptom: clicking Impulsionar/upvote makes the dashboard swap to grey skeleton mockups because the vote handlers indirectly trigger a global refetch of tasks/products/polls.
- Fix: keep the click purely optimistic. In `PollCard.handleLikeVote` (and `TaskCard.handleVote/handleLike`), remove the follow-up `getUserPollVote(...)` roundtrip and any dependency on `usePolls().refreshPolls`/`useTasks` refetch triggered by `votePoll`.
  - In `usePolls.votePoll`: remove `await fetchPolls()` — like reactions do not need to refresh the entire polls list.
  - Same in `useProducts.voteProduct` / `useTasks.voteTask` if present (audit).
- Result: reactions are instant, no full-list skeletons.

## 2. Poll card folder tab
- Bug: two identical `BarChart3` icons because `CardTypeTab` always renders `TypeIcon` inside `{!completed && ...}` even when `type=null`.
- Change `CardTypeTab`:
  - Only render `TypeIcon` when `type !== null`.
  - Add optional `subLabel?: string` prop; when provided the label becomes `"<kindLabel> · <subLabel>"`.
- In `PollCard`, pass `subLabel = opinions_only ? 'Comentário' : 'Votação'` (translated) and use different `KindIcon` per mode: `MessageSquare` for opinions-only, `Vote`/`ListChecks` for voting.
- Update tab color for polls (see 3).

## 3. Purple/lilac branding for polls
- Add a new tint mapping in `CardTypeTab` for `kind === 'poll'`: use `bg-violet-500` (or a dedicated `--poll` HSL). Reference the current create-poll modal icon tone (violet). Keep muted variant `bg-violet-500/40`.
- Preserve the modal `ModalHeader tone="violet"` (already used).
- Ensure PollCard "isNew" ring stays neutral so it doesn't clash.
- No global CSS token needed — a Tailwind `bg-violet-500` class is enough, matching existing modal tone.

## 4. Move "Repetir tarefa" (+ streak) from settings panel into `Inserir campo`
- Add optional keys `repeat` to `CreateTaskModal.OptionalKey` and `optionalFields`.
- Extract repeat/streak UI into a small `RepeatFieldSection` (props: `settings`, `onChange`) reusing existing UI from `TaskSettingsPanel`.
- Render it via `renderOptional('repeat')`. Removing this section from `TaskSettingsPanel` so it no longer appears in advanced settings (or in the detail modal's settings panel? — user only asked about creation, so keep panel intact for existing tasks. To satisfy "the field should stay in the same format" I'll move — not duplicate — it out of `TaskSettingsPanel`).
- Wire `taskSettings.repeatType/repeatConfig/enableStreak` through the same state.

## 5. Personal-task cards: remove Collaborate/Request, add "Incentivar"
- In `TaskCard`, when `task.task_type === 'personal'`:
  - Hide the collaborate + request buttons block (bottom-right).
  - Show a single "Incentivar" (Cheer) button with a counter and icon (`HeartHandshake` or `Sparkles`).
- Storage: reuse `task_likes` with a new like_type `'cheer'`? To avoid schema changes, reuse `task_feedback` content `'💪'` similar to the existing clap flow, or add a boolean per user. Simplest: introduce a `task_cheers` mini-flow via `task_feedback` (content='💪'). This mirrors clap behavior already in `FeedCardActions`.
- In `TaskDetailModal`, when `task.task_type === 'personal'`, hide "Colaboradores/Solicitantes" section entirely.

## 6. Product detail modal image
- The image in `ProductDetailModal` uses `object-cover` (crops). Change the primary image block to `object-contain` with a neutral `bg-muted/30` background to match the card style.

## 7. Product create modal — move Prioridade & Link de referência to Inserir campo; hide advanced settings
- Add `priority` and `referenceUrl` to `CreateProductModal.OptionalKey` and `optionalFields`.
- Render them via `renderOptional` (Select for priority, Input for URL).
- Remove those fields from the advanced settings dialog. If the dialog becomes empty, remove the ⚙ settings button from the header entirely.

## 8. Poll create modal defaults & advanced settings
- Remove asterisk / `required` on the "Perguntas e Votação" `FormField`. Update hint copy since both are optional:
  - PT: "Pergunta e opções de voto são opcionais. Adicione várias perguntas se quiser."
  - EN: "Questions and vote options are optional. Add more for multi-question polls."
- Change default `opinionsOnly` initial state from `false` to `true` (new polls default to comments-only).
- Remove the "Voto opcional" toggle from the advanced settings dialog. Keep control elsewhere (implicit via whether user adds options; also expose in header via type selector later — for now, remove the toggle entirely from create UI so default `opinionsOnly=true` and the user turns it off by adding vote options).
  - Simpler behavior: infer `opinions_only` at submit time — if no group has ≥ 2 options, save with `opinions_only = true`.
- Add "Quórum Máximo" field alongside the existing "Quórum mínimo": `max_quorum` in `polls`. Since this needs a DB column, either:
  - (a) Add via migration (creates `max_quorum integer`), or
  - (b) Store as a UI-only field for now.
  - Preferred: (a) tiny migration.

## Technical notes
- Files touched: `src/components/cards/CardTypeTab.tsx`, `src/components/polls/PollCard.tsx`, `src/components/polls/CreatePollModal.tsx`, `src/hooks/usePolls.ts`, `src/components/tasks/CreateTaskModal.tsx`, `src/components/tasks/TaskSettingsPanel.tsx`, `src/components/tasks/TaskCard.tsx`, `src/components/tasks/TaskDetailModal.tsx`, `src/components/products/CreateProductModal.tsx`, `src/components/products/ProductDetailModal.tsx`, `src/components/dashboard/FeedCardActions.tsx`.
- One new migration: `ALTER TABLE polls ADD COLUMN max_quorum integer` (only if you approve section 8a).
- No RLS/schema changes beyond that.

Please confirm and I'll implement. If you'd rather skip the migration in step 8, I'll store `max_quorum` client-side only for now.
