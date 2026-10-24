# Jornadas (Journeys)

A journey is a playlist of steps that people join and complete. The app checks progress on its own, using what people already do in the app. Completing journeys makes EXP grow faster.

## 1. Creating a journey (a guided form)
Open it from the **+** button in the bottom menu ("Criar Jornada"). The form has these parts:
- **Basics:** title, description, cover image, related tags (communities and skills), visibility (public or community-only, using the same rules as other items), and an optional deadline.
- **Steps** (add, reorder, remove). Each step has:
  1. **Action** (the only required field): create, complete, join or participate, comment, rate, vote, like, follow a tag, follow a person, check in at an event.
  2. **Item** (shown only for actions that use one): task, product or opinion.
  3. **Type and category** (shown after you pick an item): task type (offer, request or personal) plus subtype (meeting, event, project or service); product type; opinion type.
  4. **Tag requirements**: one or more tags, matched as "any of" or "all of". Example: a personal task tagged Corrida and/or Musculação.
  5. **Specific item** (optional): pick an existing item by searching, for example "vote in opinion X".
  6. **Indicators** (optional, more than one allowed): a measure, a comparison (greater than, less than or equal to) and a number. Measures: comments, participants, likes, dislikes/downvotes, reports, ratings, average rating, proofs. Example: complete a task with downvotes = 0.
  - Each step shows a short sentence that sums it up, for example: "Concluir 1 tarefa pessoal com #Corrida, 0 downvotes".
- **Rewards:** pick a product or service listed in the app, or write a free-form reward. Each reward has a description, and the creator can deliver it to people who finish.

## 2. Taking part
- **Journey cards** get their own look, with a gradient "quest map", the number of steps and a progress ring. They appear on the dashboard for tags the person follows and on tag pages. They follow the same privacy rules as other cards: hidden communities, blocked users and community-only items.
- **Tag page:** a new "Jornadas" section at the top.
- **Journey page** (its own link, shareable):
  - Join button and your progress (X of Y steps). Each step shows as done or pending, with a link to the item that counts for it.
  - Comments from participants.
  - "Hall da Fama": people who finished, in order.
  - Creator view: a table showing each participant's progress per step, plus a button to mark a reward as delivered.
- **Avatar menu, "Minhas Jornadas":** two tabs, "Participando" (with progress) and "Criadas" (edit, archive, follow participants).

## 3. Progress checking
- Progress is checked automatically from existing activity: tasks, team members, attendees, votes, comments, likes, ratings, tags followed and people followed.
- Only actions taken **after joining** count. One item counts for only one step of the same journey.
- Checks run when you open a journey, after key actions (create, complete, vote, comment, follow) and when you tap "Atualizar progresso".
- When every step is done, the journey is marked complete. The participant gets a notification and push alert, and the creator is told too.

## 4. Gamification
- New **"Jornadas"** counter in Status do Aventureiro → Pontuações.
- **EXP multiplier:** +10% per completed journey, up to x2.0. Your EXP is your base EXP times the multiplier. The multiplier shows next to EXP and is explained in the EXP tooltips, the journey tooltips and the character sheet.
- Finishing a journey also gives +15 base EXP.

## 5. Starter journey for everyone
"Primeiros Passos no TaskMates" is created by the platform and tied to the default tags (Self-Care, Mutual Aid, Environmental Preservation). Its 8 steps: create a task, create an opinion, create a product, follow a community tag, follow a skill tag, follow a person, take part in someone's item. New users join it automatically; existing users see it on their dashboard.

## Suggested improvements (included)
- Step templates such as "Criar tarefa com tag", so building a journey is faster.
- A short sentence summing up each step.
- Optional order: steps can be "in sequence" or "any order".
- The journey page shows a share preview when the link is sent.

## Technical details
- **Tables:** `journeys`, `journey_steps` (action, item_kind, item_type, subtype, specific entity, tag_match), `journey_step_tags`, `journey_step_indicators` (metric, op, value), `journey_rewards` (product_id or free text), `journey_tags`, `journey_participants` (joined_at, status, completed_at), `journey_step_progress` (participant, step, matched entity_type/id), `journey_comments`. All tables get GRANTs, RLS and `can_view_entity` / `can_view_tag` extended to the journey type.
- **Checking:** a SECURITY DEFINER SQL function `evaluate_journey_progress(_journey_id)` for the caller. It builds a query for each action plus filters (created_at >= joined_at). It is called through an authenticated server function. Completion is recorded in `coin_ledger` with event_id `journey:<id>:<user>`, which also makes it count only once.
- **EXP:** `useAdventurer` reads the count of completed journeys. `rpg.ts` adds `journeyCompleted` and `journeyMultiplier(n)`. The rank is worked out on the EXP after the multiplier.
- **Routes:** `/journeys/$id` (SSR with OG tags) and `/journeys` (Minhas Jornadas). Plus a CreateJourneyModal, a BottomNav item, an AppHeader menu entry, a JourneyCard in the dashboard feed and a TagJourneysSection.
- **Seed:** a migration inserts the platform starter journey, owned by the admin. A trigger auto-joins new profiles.
- **Tests:** multiplier math (cap at x2), indicator comparisons, and the starter journey having 8 steps.
- AGENTS.md gets a rule that journey progress is checked in the database. Memory gets the journey rules.

## Delivery in phases
1. Data structure, the creation form, the journey page, joining, and the cards on the dashboard and tag pages.
2. Automatic checking, the creator view, the Hall da Fama and comments.
3. EXP multiplier, the Pontuações counter, tooltips and the starter journey.
