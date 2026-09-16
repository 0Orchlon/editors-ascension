<!-- docs/AAA-SPEC.md · AAA depth-upgrade spec · 2026-09-16 -->

# Editor's Ascension — AAA Depth-Upgrade Spec

**Relationship to `docs/PERSONAL-1/spec.md`:** that document is the MVP contract and stays authoritative
for everything it already locks down (domain rules D-1..D-4, architecture boundaries, save format,
backend trust model). This document specifies what changes **on top of** that baseline to take the
game from "functional MVP" to "AAA-grade single-player experience," without changing platform,
team size, or business model. Where this spec and PERSONAL-1/spec.md conflict, this one wins for the
systems it touches; everything it doesn't mention is inherited unchanged.

**Scope decision (locked by user 2026-09-16):** depth upgrade on the existing stack. No engine
rewrite, no 3D layer, no Unity/Unreal/Godot, no team/budget/marketing plan. "AAA" here means:
production-grade content depth, systems complexity, narrative craft, polish, and long-tail
replayability — delivered inside `web-app/` + `server/` + `shared/` as they exist today.

---

## 1. Vision & pillars

Editor's Ascension is a solo RPG shell around real creative-skill practice (video editing, Blender,
animation, color, sound). The AAA bar for a game like this is not "more polygons" — it's **a world
players want to stay in for hundreds of hours because the systems, story, and feedback loops are as
deep as the craft it's teaching.**

Five pillars govern every decision below:

1. **Diegetic mastery.** Every system reinforces "you got better at a real skill," never abstract
   grind. XP sources, gear, and titles all trace back to a real deliverable or a real lesson.
2. **Legible failure.** No black-box loss. Every boss loss, quiz miss, or rejected claim explains
   *why* and *what to do next* (inherited from DG-4/BS-3, extended everywhere).
3. **Long arc, short session.** A single sitting is 10–30 minutes; the campaign spans months. Both
   must feel complete on their own terms (session loop vs. season arc).
4. **No fake numbers.** Coins/loot/cosmetics stay non-power (EC-1 inherited). AAA depth comes from
   *systems* variety, not inflated stats that trivialize the craft underneath.
5. **Single player, zero ops burden.** Everything ships as static content + one SQLite file. No
   live server team, no matchmaking, no payments infrastructure.

---

## 2. Baseline → target (scale of the depth upgrade)

| Axis | Current (MVP) | AAA target | Driver |
|---|---|---|---|
| Worlds / seasons | 5 worlds, 1 campaign | 5 worlds × 3 seasons (15 world-instances), same worlds revisited at higher mastery | §5.4 |
| Main quests | 19 | 45+ (15/season) | §5.4 |
| Side quests | 20 | 70+ | §5.5 |
| Study Dungeons | 16 | 40+, with adaptive question banks (not fixed sets) | §5.6 |
| Bosses | small fixed set | 14 (7 base + 7 hard-mode remixes) | §5.9 |
| Achievements | 21 | 60+, across 5 tiers (bronze→mythic) | §5.11 |
| Loot / cosmetics | 18 | 90+ across 6 slot types + camp decorations | §5.11 |
| Encounters | 8 | 24+, organized into 4 chained event lines | §5.8 |
| Skill tree nodes | 24, flat-ish | 60+, 6 mastery trees with tiers + capstones + respec | §5.3 |
| Reputation systems | none | 4 "Guilds" with independent rep tracks | §5.10 |
| Difficulty modes | none | Standard / Hard / Director's Cut per boss & dungeon | §5.9 |
| Save slots | 1 implicit | up to 3 named characters/runs | §5.15 |

These are targets for **content volume**, not a mandate to hand-author all of it before shipping —
§7 phases delivery so the game is playable and coherent at every wave.

---

## 3. Domain model additions

New entities layered on top of `shared/types` (full JSON Schema goes in a follow-up
`contracts-v2.yaml`; this section fixes the rules a schema must encode):

- **`MasteryTrack`** — one per craft domain (`editing`, `camera`, `animation`, `colorAudio`,
  `story`, `pipeline`). Each has its own XP curve (reuses PRG-1's curve shape, independent totals),
  independent of character level. Character level = a derived roll-up (see §5.2).
- **`Season`** — a bounded arc of a world (`worldId`, `seasonIndex 1..3`, its own quest/side-quest
  pool, its own boss). Seasons unlock strictly in order; season *N+1* of a world requires season
  *N*'s boss cleared at `mvp` tier or better (reuses BS-2 tiers).
- **`Reputation`** — per-Guild integer, changes only via quest/side-quest tag completion (no direct
  grant). Never gates content, only unlocks cosmetics/titles/flavor dialogue (pillar 4: no power).
- **`DifficultyTier`** (`standard | hard | directorsCut`) — attached to a boss/dungeon attempt, not
  to the player globally. Hard mode changes the *question bank / grading rubric*, not stat padding.
- **`ReplayLogEntry`** — append-only record of {timestamp, action, result} for every claim, boss
  attempt, dungeon attempt. Powers "personal best" displays and the trophy room (§5.11) without any
  server-side leaderboard.
- **`CosmeticGrant`** — links a `LootItem`/`Title`/`CampDecoration` to the event that unlocked it,
  purely for the collection-log UI; carries no gameplay effect (extends EC-1's `"cosmetic"` contract).
- **`ContentPatch`** — a version-stamped content pack delta (see §5.16); reuses the existing
  `GET /api/content/pack` ETag mechanism, adds a `patchNotes` field surfaced in-game.

Domain rules D-1..D-4 from PERSONAL-1/spec.md apply unchanged to all of the above: UI never mutates
these directly, every mutating function is pure `(state, input) → {state, events[]}`, no negative
resources, every rejection carries a machine-readable reason code.

---

## 4. Systems specification

Each subsection lists the system, the design intent, and testable AC entries (`[U]`/`[I]`/`[C]`/`[S]`/`[A]`
per PERSONAL-1/spec.md §4 conventions). IDs are prefixed `AAA-` to avoid colliding with existing ACs.

### 4.1 Narrative & world layer — AAA-NAR

Today, quests are a flat list with a title and deliverables. AAA depth means the campaign reads as
an actual story, not a checklist.

- A recurring **mentor NPC** per world (a distinct voice/personality in flavor text, not a real
  person) frames each season's opening and closing quest with 2–4 sentences of diegetic text.
- Each season has a one-paragraph **premise** and a one-paragraph **resolution**, both authored in
  `shared/content/seasons.json` (new file), shown on season start/complete.
- **Branching flavor, not branching mechanics**: side quests within a season can carry a
  `narrativeThread` tag; completing 3+ quests on the same thread unlocks one bonus flavor scene
  (text only). No mechanical divergence — keeps content authoring bounded.

| ID | Criterion | Type |
|---|---|---|
| AAA-NAR-1 | Every `Season` has non-empty `premise`, `resolution`, and a `mentorId` resolving to a defined mentor voice. | [C] |
| AAA-NAR-2 | Season premise is shown once on first entry (persisted flag in save so it doesn't repeat). | [U][S] |
| AAA-NAR-3 | `narrativeThread` payoff scene requires exactly the 3 tagged quests completed, no fewer/more, and grants 0 XP (flavor only, pillar 4). | [U] |

### 4.2 Progression overhaul — AAA-PRG

- Character level (PRG-1..6, unchanged) becomes a **roll-up display**, not the only progress axis.
  Each `MasteryTrack` levels independently 1..10 using the same curve shape as PRG-1 but its own XP
  pool, fed only by quests/dungeons tagged for that domain.
- **Prestige**: reaching mastery 10 on a track unlocks a *Prestige* toggle for that track: track
  resets to 1, keeps a permanent cosmetic title (`"{Domain} Adept I/II/III"`), and all future XP into
  that track is shown with a small multiplier-free "prestige star" — purely cosmetic per pillar 4.
- Skill Points (PRG-3) still come from character level; Mastery Points (new, 1 per mastery-track
  level) spend only in that track's branch of the skill tree (§4.3).

| ID | Criterion | Type |
|---|---|---|
| AAA-PRG-1 | Each `MasteryTrack` uses PRG-1's exact threshold table, independently keyed; no cross-track XP bleed (unit test feeds domain-tagged XP, asserts only target track moves). | [U] |
| AAA-PRG-2 | Prestige is available only at track level 10; resets XP to 0 and level to 1; permanent flag `prestigeCount` increments; never decreases another track. | [U] |
| AAA-PRG-3 | Mastery Points earned == sum of mastery-level-ups across all tracks; spendable only on skill nodes whose `track` field matches. | [U] |

### 4.3 Skill tree v2 — AAA-SKL

- Expand from a flat 24-node list to **6 mastery trees** (one per domain), each with 3 tiers
  (Foundation → Craft → Capstone), ~10 nodes/tree.
- **Capstone nodes** (1 per tree, tier 3) require: mastery track ≥ level 8, all tier-1 nodes in that
  tree unlocked, and ≥1 boss cleared in that domain at `advanced` tier or better. Capstones grant a
  cosmetic-only visual flourish (camp banner, title) — never a stat/unlock outside cosmetics.
- **Respec**: a "Reflect" action refunds all points in one tree back to Mastery Points, at most once
  per 7 in-game days (soft friction, not a hard wall — reuses stamina-style cooldown pattern).

| ID | Criterion | Type |
|---|---|---|
| AAA-SKL-1 | Every tree has exactly 3 tiers; tier-3 has exactly 1 capstone node; prerequisite graph per tree is a DAG (reuses MQ-2's cycle check). | [C] |
| AAA-SKL-2 | Capstone unlock enforces all three gates (mastery level, tier-1 completeness, boss tier); missing any → `PREREQ_NOT_MET`. | [U] |
| AAA-SKL-3 | Respec refunds exactly the spent points of one tree, zeroes its unlocks, and cannot run again until 7 in-game days elapse (`INVALID_INPUT`-class rejection with reason `RESPEC_ON_COOLDOWN`). | [U] |

### 4.4 Campaign expansion — AAA-MQ

- Each of the 5 worlds gets 3 seasons (§3), 15 quests total across a world instead of today's flat
  list. Season *N* quests unlock only after season *N-1*'s boss is cleared (ties into AAA-NAR + BS).
- Quest `estimatedMinutes` distribution must still skew toward the 20–90 minute range that made the
  MVP loop work (MQ-5 inherited) — depth means more quests, not longer ones.

| ID | Criterion | Type |
|---|---|---|
| AAA-MQ-1 | Content pack has exactly 15 quests per world × 5 worlds = 75 quest slots minimum, 45+ authored at initial AAA launch wave (remaining seasons back-fillable without a schema change). | [C] |
| AAA-MQ-2 | Season gate: quest with `seasonIndex>1` is unreachable (`PREREQ_NOT_MET`) until previous season's boss attempt tier ≥ `mvp`. | [U] |

### 4.5 Side quests & anti-grind v2 — AAA-SQ

- Side quest pool grows to 70+, still governed by SQ-2's diminishing-XP formula and SQ-4's anti-grind
  ceiling (both inherited unchanged — depth is variety, not a new grind curve).
- New **side quest chains**: 4-quest micro-arcs (`chainId`, `chainStep 1..4`) that pay a one-time
  completion bonus (flat, not compounding) on step 4, encouraging follow-through without breaking
  SQ-3's "side quest XP < world's cheapest main quest XP" ceiling.

| ID | Criterion | Type |
|---|---|---|
| AAA-SQ-1 | Every `chainId` has exactly 4 steps, strictly ordered, no gaps; chain bonus ≤ the world's cheapest main-quest XP (extends SQ-3's ceiling to chain bonuses). | [C] |
| AAA-SQ-2 | Chain bonus grants exactly once per chain per save; re-completing step 4 (if repeatable) does not re-grant it. | [U] |

### 4.6 Study Dungeon v2 — AAA-DG

- Fixed question sets (DG-1) become **question banks**: each dungeon defines a pool of ≥6 mastery
  questions, of which 3 are drawn per attempt (seeded, like ENC-2), so repeat attempts aren't rote
  memorization of the same 1–2 questions.
- **Spaced-repetition resurfacing**: a dungeon cleared >14 in-game days ago appears as a low-priority
  daily-mission candidate ("Refresher") — reuses DM-3's ranking, inserted below fresh content.

| ID | Criterion | Type |
|---|---|---|
| AAA-DG-1 | Every dungeon's question bank has ≥6 questions; a given attempt seed selects exactly 3 without repeats within that attempt. | [C][U] |
| AAA-DG-2 | Refresher candidates only surface when no fresh main-quest/dungeon/side-quest candidate exists at DM-3's tiers 1–3, and only for dungeons cleared ≥14 days ago. | [U] |

### 4.7 Project Forge v2 — AAA-PJ

- Milestones stay at 10/project (PJ-1 inherited). AAA depth adds a **portfolio review**: on project
  completion, the player self-scores against a rubric (reuses BS-1's 0..10, 6-category shape) and the
  result feeds a "Portfolio" tab — a read-only gallery of completed projects with their scores and
  `evidenceRef` links, separate from the achievements list.
- Project catalog grows from whatever exists today to ≥12 project templates spanning all 6 domains.

| ID | Criterion | Type |
|---|---|---|
| AAA-PJ-1 | Portfolio entry created exactly once per completed project, immutable after creation (re-completing milestones, if ever allowed, does not overwrite it). | [U] |
| AAA-PJ-2 | Project catalog has ≥2 templates per domain (6 domains × 2 = 12 minimum). | [C] |

### 4.8 Encounters v2 — AAA-ENC

- Grow from 8 flat encounters to 24+, organized into **4 chained event lines** (e.g., a recurring
  rival editor who appears with escalating flavor across a season). Each line has 3–6 steps, seeded
  deterministically like today's ENC-2, one line active at a time per world to avoid pile-up.

| ID | Criterion | Type |
|---|---|---|
| AAA-ENC-1 | At most 1 encounter chain is "active" per world at a time; chain step N+1 only becomes eligible after step N resolves. | [U] |
| AAA-ENC-2 | Chain resolution is still ≤2 minutes of player action (inherits ENC-1's ceiling) regardless of narrative wrapper length. | [C] |

### 4.9 Bosses v2 — AAA-BS

- Every boss gets a **Hard Mode** remix: same 6 categories (BS-1), same 0..10 scale, but a stricter
  tier table (raise each cutoff by ~15%) and a rubric variant that asks for a harder deliverable.
  Hard mode is opt-in per attempt, never required for main-quest progression — only for the
  Director's Cut achievement tier and the capstone skill-node gate (§4.3).
- **Rematch**: any boss can be re-attempted any time; the Replay Log (§3) keeps the best-ever tier
  per (boss, difficulty) pair for a personal-best display — no server leaderboard, no cross-player
  comparison (keeps the "no multiplayer" non-goal intact).

| ID | Criterion | Type |
|---|---|---|
| AAA-BS-1 | Hard-mode tier cutoffs are strictly higher than standard for the same boss; a score that passes hard mode always also passes standard at the same tier or better (no inversion). | [U] |
| AAA-BS-2 | Personal-best is `max` over all past attempts per (bossId, difficulty); never decreases when a worse attempt is logged. | [U] |
| AAA-BS-3 | Rematch has no cooldown and no stamina/resource gate beyond the boss's normal `staminaCost` (rematching must stay frictionless — depth via mastery, not gating). | [U] |

### 4.10 Reputation / Guilds — AAA-REP

- 4 Guilds (`Colorists' Circle`, `Animation Guild`, `Story Collective`, `Signal Chain` [audio/tech]).
  Completing a quest/side-quest with a matching tag grants +1..+3 rep to the relevant guild(s) —
  purely additive, no spending, no decay.
- Rep thresholds (10/25/50/100) unlock **cosmetic-only** guild titles and camp banners. No gameplay
  gate ever reads a rep value (hard rule, enforced by the same "cosmetic effect" contract as EC-1).

| ID | Criterion | Type |
|---|---|---|
| AAA-REP-1 | No domain function outside the rep/cosmetic module reads a `Reputation` value (import-boundary test, mirrors EC-1's approach). | [U] |
| AAA-REP-2 | Rep only increases; a quest/side-quest grants rep exactly once regardless of repeat completions if `repeatable:false`, or per SQ-2's diminishing schedule if repeatable. | [U] |

### 4.11 Cosmetics, camp, trophy room — AAA-COS

- Loot/cosmetic catalog grows to 90+ across 6 slot types (avatar frame, camp banner, title, camp
  decoration, UI theme accent, achievement badge frame).
- **Trophy room**: a new Camp sub-screen listing every unlocked cosmetic with its unlock source
  (quest/boss/achievement/guild rank), read-only, and a small camp-decoration layout the player can
  rearrange (client-only state, not gameplay — no new save-schema risk beyond a `campLayout` blob).

| ID | Criterion | Type |
|---|---|---|
| AAA-COS-1 | Every cosmetic item has a non-empty `unlockSource` resolving to a real quest/boss/achievement/guild-rank id (content validation, prevents orphaned rewards). | [C] |
| AAA-COS-2 | `campLayout` is validated as pure UI state: removing it and reloading does not change level/XP/inventory (guards against scope creep into gameplay). | [U] |

### 4.12 Accessibility & polish — AAA-A11Y

Builds on A11Y-1..6 (unchanged, still required):

- **Colorblind-safe mode**: an alternate palette token set (protanopia/deuteranopia-safe), toggle in
  Settings, no information conveyed by hue alone anywhere in the new systems (rep bars, mastery
  tracks, hard-mode indicators all carry icon/text redundancy per A11Y-3).
- **Full remap**: every keyboard shortcut introduced by new UI (trophy room, portfolio, mastery
  tabs) is rebindable, defaults documented in Settings.
- **Juice with an off-switch**: all new animation/particle "juice" (§4.13) respects
  `reducedMotion` (A11Y-2) with zero exceptions — a juice effect that ignores it is a bug, not a
  feature.

| ID | Criterion | Type |
|---|---|---|
| AAA-A11Y-1 | Colorblind mode swaps only color tokens; no layout/spacing/copy changes (regression-safe toggle test). | [A][U] |
| AAA-A11Y-2 | Every new interactive element added by this spec is reachable by keyboard and has a visible focus ring (extends A11Y-1's audit to new screens). | [A][S] |
| AAA-A11Y-3 | `reducedMotion=true` disables 100% of new particle/transition effects; automated check greps new animation triggers for the reduced-motion guard. | [A][U] |

### 4.13 Audio/visual production & "juice" — AAA-FX

Without a 3D engine, AAA *feel* comes from motion and sound layering on top of the existing DOM UI:

- **Feedback layering**: every claim/level-up/boss-tier result gets a distinct micro-animation
  (CSS transform/opacity, <300ms) + a distinct short SFX cue (already-loaded audio sprite, no new
  network fetch per event) + haptic-style screen accent — all three degrade gracefully to "just
  text" when `reducedMotion`/muted.
- **Adaptive music**: a small looping ambient track per world (already-established `sound.ts`
  module extended, not replaced), crossfades on world/season transition, never autoplays with sound
  above a user-set volume of 0.
- **Visual theming per world**: a CSS custom-property palette per world (color only, no new asset
  pipeline), swapped on navigation, decorative only (never the sole carrier of state per A11Y-3).

| ID | Criterion | Type |
|---|---|---|
| AAA-FX-1 | Every event type in `LEVEL_UP, QUEST_CLAIMED, BOSS_RESULT, ACHIEVEMENT_UNLOCKED` has a registered animation+SFX pair; missing pairs fail a content-completeness test. | [C] |
| AAA-FX-2 | No SFX plays if master volume is 0 or `reducedMotion` disables the paired animation (single source of truth, no separate mute path) — inherits A11Y-5's "no sound required" guarantee. | [U] |
| AAA-FX-3 | World theme swap changes only CSS custom properties; DOM structure/aria attributes are unchanged (snapshot test). | [U] |

### 4.14 Content authoring tooling — AAA-TOOL

Hand-authoring 200+ new content entries by hand in raw JSON doesn't scale even for a solo project.

- A small **content-validator CLI** (`shared/validate` extended, not replaced) runs all of §4's
  `[C]` checks against the full pack in one command, usable in a pre-commit hook.
- Optional (nice-to-have, not blocking): an in-app **Settings → Content Debug** panel (dev-only,
  behind a `?dev=1` flag, never shipped to the "real" build) that lists validation errors inline
  instead of requiring a terminal — ponytail-sized: reuse the existing validator output, just render
  it, no new engine.

| ID | Criterion | Type |
|---|---|---|
| AAA-TOOL-1 | `npm run validate:content` (new script) runs every `[C]`-tagged rule in this spec and PERSONAL-1/spec.md against the live content pack, exits non-zero on any failure. | [I] |
| AAA-TOOL-2 | Content-debug panel only renders when `?dev=1` is present; absent in default production build (bundle-excluded or route-guarded). | [U][S] |

### 4.15 Telemetry (local-only, privacy-preserving) — AAA-TEL

Tuning 45+ quests and 40+ dungeons without any data is guesswork. Given the non-goal on
third-party analytics (PERSONAL-1/spec.md §6), telemetry here is **local-only**:

- A `telemetry.json` export (opt-in toggle, default OFF) the player can generate from Settings,
  containing aggregate counters already in the save (completion counts, attempt tiers, time-to-clear
  estimates) — no new tracking, just a formatted export of state that already exists.
- No network call ever sends this data anywhere; it is a local file the player may choose to share
  manually (e.g., pasting into a bug report).

| ID | Criterion | Type |
|---|---|---|
| AAA-TEL-1 | Telemetry export is OFF by default; toggling it on/off never mutates gameplay state. | [U] |
| AAA-TEL-2 | No code path sends telemetry data over the network (static import-boundary check: telemetry module has zero `fetch`/`XMLHttpRequest` usage). | [U] |

### 4.16 Save v2 — AAA-SV

- **Multi-slot**: up to 3 named save slots client-side (extends SV-1's schema with a `slotId`), each
  independently exportable/importable per SV-4/SV-5. Server-side sync (BE-7) applies per-slot if a
  slot is linked to the anonymous `playerId`; unlinked slots stay local-only.
- Replay Log (§3) is capped (e.g., last 500 entries) and pruned oldest-first to keep save size bounded
  — depth in *content*, not unbounded save growth.

| ID | Criterion | Type |
|---|---|---|
| AAA-SV-1 | 3 slots max; creating a 4th is rejected with a clear reason, not a silent overwrite. | [U] |
| AAA-SV-2 | Replay log never exceeds its cap; oldest entries drop first (FIFO), newest entries always retained. | [U] |
| AAA-SV-3 | Migration v(n-1)→v(n) for the multi-slot format wraps a legacy single-slot save into slot 1 automatically (reuses SV-1's migration contract). | [U][I] |

### 4.17 Backend v2 — AAA-BE

Trust model (A1/A2 in PERSONAL-1/spec.md) is unchanged: backend stays a content distributor + save
store, anonymous token, no accounts. Additions:

- `GET /api/content/pack` gains a `patchNotes` field per `ContentPatch` (§3), still governed by the
  existing ETag/`If-None-Match` mechanism (BE-6 inherited, no new endpoint).
- Multi-slot saves (§4.16) use the existing `PUT .../save` + `If-Match` contract (BE-3), keyed by
  `slotId` as an additional path/query segment — no new auth model, no new trust boundary.

| ID | Criterion | Type |
|---|---|---|
| AAA-BE-1 | Content pack response validates against the extended schema (adds `patchNotes`, `seasons`, `guilds` collections) without breaking existing BE-1 contract tests. | [I] |
| AAA-BE-2 | Per-slot save endpoints enforce the exact same 401/403/409 rules as BE-3/BE-4 today (regression tests reused, parameterized over `slotId`). | [I] |

---

## 5. Non-functional / quality bar

| Area | Bar |
|---|---|
| Bundle size | `web-app` production build stays under a defined budget (e.g., +30% over current MVP baseline, not unbounded) — content is JSON fetched at runtime, not bundled, so this should hold naturally; a size-budget test enforces it. |
| Content pack size | `GET /api/content/pack` payload stays under 2MB even at full AAA content volume (JSON, gzip-friendly); tested against the real pack, not a sample. |
| Test coverage | Every `[U]`/`[I]`/`[C]` ID in this document has a corresponding test before its content ships — same discipline as PERSONAL-1/spec.md Q-1..Q-5. |
| Performance | Boss/dungeon attempt scoring, mastery roll-up, and daily-mission selection each stay O(content size), not O(content size²) — matters once content is 3-4x larger. |
| Accessibility | Full AAA-A11Y section passes automated + the existing A11Y-1..6 continues to pass unmodified. |

---

## 6. Delivery phasing (waves, not a big-bang rewrite)

Depth ships incrementally so the game stays playable and coherent between waves; no wave breaks an
earlier wave's acceptance criteria.

1. **Wave 1 — Foundations**: `MasteryTrack`, `Reputation`, `DifficultyTier`, `ReplayLogEntry` domain
   types + migrations (AAA-PRG, AAA-REP, AAA-SV). No new content yet — proves the schema.
2. **Wave 2 — Systems on existing content**: Skill tree v2 restructuring current 24 nodes into the
   6-tree/3-tier shape (AAA-SKL) without requiring new content; Boss hard-mode remix of existing
   bosses (AAA-BS); trophy room + cosmetics catalog reorganization (AAA-COS).
3. **Wave 3 — Content volume**: author season 2/3 quests, expanded side-quest chains, dungeon
   question banks, new encounters (AAA-MQ, AAA-SQ, AAA-DG, AAA-ENC) — the bulk of the authoring work,
   unblocked by waves 1–2's schema.
4. **Wave 4 — Polish**: narrative pass (AAA-NAR), FX/juice layer (AAA-FX), telemetry export
   (AAA-TEL), content tooling (AAA-TOOL), full a11y sweep (AAA-A11Y).

Each wave ends at a shippable state; PERSONAL-1/spec.md's Q-1..Q-5 quality gates run at every wave.

---

## 7. Non-goals (reaffirmed + new)

Everything already out of scope in PERSONAL-1/spec.md §6 stays out of scope: multiplayer, user
accounts/passwords, third-party analytics, real-time Blender integration, marketplace, mobile native
app, hosting/CI. This spec adds, explicitly:

- **No monetization.** No payments, no ads, no IAP — this is a personal project, not a commercial
  live-service; "AAA" here means craft depth, not a business model.
- **No server-side leaderboards or cross-player comparison.** Personal-best tracking (AAA-BS-2) stays
  local to the save; adding a real leaderboard is a scope change requiring explicit approval (reuses
  PERSONAL-1/spec.md's "any non-goal reversal needs human sign-off" rule).
- **No voice acting / real audio recording pipeline.** Narrative stays text; "audio production" in
  §4.13 means SFX/music layering with existing/licensed loop assets, not a VO pipeline.
- **No 3D art pipeline.** All visual depth (§4.13) is CSS/DOM-based theming and animation.

---

## 8. Open questions (non-blocking — proceed on stated defaults)

1. Exact Guild names/flavor voice for the 4 reputation tracks (§4.10) — placeholders above, needs a
   human pass for tone consistency with the mentor NPCs (§4.1), same approval class as PERSONAL-1's
   `tutorialRefs` sourcing (A8).
2. Whether the 3-season-per-world structure (§4.4) should be uniform across all 5 worlds or vary by
   world — default assumption is uniform (simpler to validate, simpler to author against).
3. Audio/music asset sourcing (licensed loops vs. commissioned) for §4.13 — outside this spec's
   authority; needs a human decision before Wave 4 content-locks.

None of these block Wave 1–2 engineering work, which only needs the schema and system rules, not
final content/flavor text.
