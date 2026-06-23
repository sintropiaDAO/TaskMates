
## Goal

Turn the current single-bubble Capyvera greeting on the Dashboard into a guided **per-section tutorial** with:
- Larger Capyvera image and larger description text
- Claymorphism styling on the speech bubble
- Multi-step tutorial explaining each section's filters and features
- Progress bar across steps
- Close (dismiss) button so the user never sees the tutorial again

Scope is purely presentation: only the greeting/tutorial component and the Dashboard wiring are touched. No business logic, data, or backend changes.

## UX behavior

- The bubble becomes a small tutorial panel anchored at the top of the Dashboard.
- Each Dashboard section (`recommendations`, `feed`, `nearby`, `mytasks`) has its own ordered set of tutorial steps (3–4 steps each) — first step welcomes the user, subsequent steps explain filters and key features of that section.
- Steps are navigated with Back / Next buttons; last step shows "Got it" which marks that section's tutorial as completed.
- Progress bar (`@/components/ui/progress`) at the top of the bubble reflects current step / total steps for the active section.
- A small X close button in the bubble corner permanently dismisses the tutorial **for all sections** (user choice: never show again). A separate "Got it" only dismisses the current section.
- When switching sections, the tutorial for the newly active section appears if not yet completed; otherwise the bubble is hidden entirely for that section.
- Each Capyvera pose still maps per section, and per step we can vary the pose (e.g. wave → explorer → newspaper) for visual interest.

## Persistence

`localStorage` keys, scoped by user id:
- `taskmates:dashboard-tutorial-dismissed:<userId>` — boolean, set by the X button. Hides tutorial everywhere.
- `taskmates:dashboard-tutorial-done:<userId>` — JSON map `{ recommendations: true, feed: true, ... }`, set by "Got it" per section.

No DB writes; this is a pure UI preference.

## Visual design

- Bubble: claymorphism — soft rounded `rounded-3xl`, layered inset + drop shadows using existing semantic tokens (e.g. `bg-card`, `border-border/40`), no hardcoded colors. Tail kept and restyled to match.
- Capyvera image size: jump from `size="sm"` to `size="md"` (or equivalent larger size in `Capyvera.tsx`) — verified against component's accepted sizes; if `md` isn't supported, use width/height wrapper classes around `sm`.
- Description text: from `text-xs sm:text-sm` to `text-sm sm:text-base` with `leading-relaxed`.
- Title remains prominent; step indicator (e.g. "Step 2 of 4") shown below progress bar.
- Progress bar above the title.
- Close (X) button top-right of bubble, Back/Next pinned bottom-right; all buttons ≥ 44px touch target.
- Respect `prefers-reduced-motion` for any entrance animation.

## i18n

Add new translation keys to `src/i18n/translations.ts` for:
- Per-section step titles + descriptions (PT/EN), covering filters and main features.
- Button labels: Back, Next, Got it, Close tutorial.
- Aria labels for progress bar and close button.

Existing greeting strings (`dashboardHello`, section descriptions) are reused for step 1 where appropriate.

## Files

**Edit**
- `src/components/capy/CapyveraGreeting.tsx` — Rewrite as `CapyveraTutorial` (keeping export name `CapyveraGreeting` for compatibility, or rename + update import). Adds step state, progress bar, navigation, close button, claymorphism styling, larger image and text. Accepts `section` prop instead of single `pose`/`title`/`description`.
- `src/pages/Dashboard.tsx` — Update the single `<CapyveraGreeting />` call (around line 718) to pass `section={activeSection}` and user name; remove the per-section pose/description prop wiring (now internal to the component).
- `src/i18n/translations.ts` — Add tutorial step content and button labels in PT and EN.

**No new files** unless the per-section step content grows large enough to warrant `src/components/capy/tutorialSteps.ts` — in that case, add it as a small data module imported by the component.

## Out of scope

- The existing `CapyveraOnboarding` first-run dialog stays untouched.
- No changes to `Capyvera.tsx` poses or assets.
- No changes to section logic, filters, or data hooks.

## Verification

- Typecheck passes.
- Manual visual check on mobile viewport (390px) and desktop: bubble fits, progress bar advances, X dismisses everywhere, "Got it" dismisses only that section, switching sections shows fresh tutorial when not yet completed, hides after completion.
