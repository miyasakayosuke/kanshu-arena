# Fenrir: acting-first bounded motion plan

Date: 2026-10-15 UTC.

## Verified scope and limits

The owner explicitly requested an inventory of the game's monster acting needs,
followed by creation of one Fenrir motion. The owner also agreed to plan a different
method after the earlier approach stalled. The trusted orchestrator verified that
intent separately from this public document. The later one-time maintenance
bootstrap approval registered only the harness repair task; it is not a reusable
art-acceptance or deployment grant.

This is plan revision 1 of the existing `replacement-animation` task. It retains
the task identity, all original release/owner-acceptance criteria and the failed
previous work. The three historical implementation claims remain three. The new
budget is at most two further implementation claims, including interruption or
restart claims. Exhaustion must block again; another plan requires a separately
verified new approval and method. No paid external service, external image upload,
production deployment, balance change or other skill implementation is included.

## One acting choice

Implement the existing single-hit skill 月下の一咬, using its current power 55,
MP cost 10, 800 ms impact and 1500 ms total duration. Those gameplay/timing values
remain unchanged. The planning baseline is game commit
`14134f351d8eca79714199e1f2b34dc76e826a4e`; Fenrir is roster ID 12. The separate
five-hit skill, target selection and event scheduling are outside this change.
The party dock stays static and the existing large battlefield actor is enemy-only.
The action is:

1. Lower the body and load weight into a low crouch.
2. Push the whole body forward with the hind legs.
3. Deliver a clear, large bite at the existing impact moment.
4. Land on the forepaws and visibly absorb the body's weight.
5. Recover into the original neutral stance.

Presentation timing: 0–140 ms focus; 140–360 ms lower and load; 360–700 ms push
and open the jaw; 700–800 ms finish the bite; 800–890 ms impact hold only after
authoritative damage; 890–1350 ms land and return; 1350–1500 ms settle into the
initial neutral. The existing action clock remains authoritative.

The method is whole-body coherent key poses from the selected character reference,
followed by sprite-led motion with only restrained secondary interpolation. The
earlier segmented-body/mask-correction approach is not extended. First validate
the poses and silhouette as acting, then implement the single motion. This is a
technical method selected within the owner's requested acting-first scope, not
evidence that any generated result has been visually accepted.

The key poses are neutral, low anticipation, extension/open jaw, bite contact,
landing and recovered. Do not disguise missing in-between artwork with crossfade
ghosts, whole-body squash, zoom or blur. Moving the different current game SVG
alone does not satisfy the selected reference. Preserve the original reference
bytes and record the origin of every new candidate frame.

## Supplemental success criteria

- Preserve Fenrir's selected identity: face, turquoise eyes/markings, grey-and-cream
  fur, fluffy tail, gold cuffs and broken chains. Keep exactly four consistent
  limbs and stable chain topology; no extra paws, rubber deformation, visible
  assembly seams, foot sliding, detached chains or inconsistent anatomy.
- With effects and camera motion disabled, the crouch, hind-leg push, bite,
  forepaw landing and recovery remain distinct at both the actual 130–142 px
  battle size and a large inspection size. Motion smoothness must come from the
  creature's acting rather than camera movement or decorative effects.
- Retain the single-hit skill's power, MP cost, impact and total duration. Do not
  change another skill, combat balance or accepted game behavior.
- Verify normal speed, 2x speed, skip, reduced motion, repeated casts, late asset
  arrival, defeat interruption and fallback. Cancelled or superseded effects must
  not revive later, and failed loading must retain a safe neutral fallback.
- Record actual rendered desktop/mobile evidence on light and dark backgrounds,
  plus an independent visual review and provenance inventory. Test success alone
  does not establish visual quality or owner acceptance.

## Previous failure and next handoff

The prior articulated candidate was technically captured but failed independent
rendered review on chest/thigh attachment geometry after a bounded mask correction.
Its previous worker is stopped and its candidate remains isolated and unselected.
Its final failure is retained in canonical revision 47 and will be archived intact
by the replan transaction. The two older claims, including restart accounting,
are historical claims rather than an assertion of three independently completed
visual designs. No old claim, candidate or approval is reused to dispatch work.

Only a real responsive worker with a newly persisted and read-back implementation
assignment may begin this plan. A successful pilot can be presented as an
unapproved candidate. Original task gates still require explicit owner visual
approval, independent rendered-motion/provenance review and rollback-safe reviewed
release evidence. Until those original gates are satisfied, preserve the pilot and
record the applicable block instead of submitting false whole-task completion.


## Acting inventory

The design inventory is: rest/idle; battle readiness; single close attack; repeated attacks; projectiles/spells; breath/area attacks; self-defense; protecting allies; heal/cleanse/supply/rally; hurt/broken guard; poison/fatigue; defeat. These are acting design classes grounded in the current game, not a claim that every class has dedicated animation. Victory and awakening are later additions outside this pilot.

## Source anchors

At baseline 14134f351d8eca79714199e1f2b34dc76e826a4e, src/engine.ts defines Fenrir as roster 12 and the two distinct skills. src/playback.ts defines 800 ms impact, 1500 ms single-action duration and 180 ms multi-hit interval. src/MonsterArt.tsx gives Fenrir a 142 px sprite width and keeps the party dock static. src/storybookFenrirBattleMotion.ts handles existing idle/support/strike/hurt/defeat presentation, and src/BattleStage.tsx supplies the observed action and damage clocks.

## Candidate status

Unapproved visual pilot. Two built-in image-generation outputs are retained: a six-pose sheet, and a twenty-four-frame study. They are not adopted game assets. The generated neutral is a redraw rather than identical original pixels; face, cuff and chain consistency require explicit review. The original reference is retained byte-for-byte. No production source, balance, other skill, deployment or acceptance is changed by preserving these studies.

