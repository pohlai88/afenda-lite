You are right — the command must be an **operational agent command sheet**, not an art-direction essay.

# Lynx Sovereign Landing — agent command sheet (copy-paste)

**Purpose:** Paste one command block below into a new coding-agent turn so the Lynx landing work loads the same assets, architecture rules, motion doctrine, accessibility gates, and done-bar every time—without turning into random CSS experimentation.

**How to use**

1. Copy **exactly one** command block.
2. Paste it as the first message to the coding agent.
3. Replace only fields marked `<REPLACE>`.
4. Do not edit the locked context unless intentionally changing the design policy.
5. Begin with **Command A** for the first implementation pass.

---

## Locked context — always true

```text
PROJECT: afenda-lite
ROOT: C:\JackProject\afenda-bolt\afenda-lite

EXPERIENCE: Lynx Sovereign Landing
PURPOSE: cinematic entry surface for sign-in and sign-up
PRIMARY HERO: public/lynx/lynx-laptop.png or optimized equivalent
VAULT ART: public/lynx/lynx-auth-popup.png
BROWSER ASSET PATHS:
- /lynx/lynx-laptop.png
- /lynx/lynx-auth-popup.png

CORE IDEA:
The Lynx is the interface.
The shield/keyhole is the authentication portal.
The experience is an unlock ritual, not a normal modal workflow.

DESIGN LANGUAGE:
cinematic · editorial · calm luxury · sovereign · mysterious · precise
quiet during idle · powerful during interaction
light half = manifestation / creation
dark half = return / protection

ARCHITECTURE:
React owns interaction phases and route intent.
Refs + requestAnimationFrame own pointer motion.
CSS owns visual choreography.
Canvas may own particles only.
Artwork remains authoritative and visible.
Particles enhance artwork; they never rebuild the full image.

FORBID:
- generic SaaS hero composition
- generic centered glass modal
- full-image particle reconstruction
- continuous noisy particle loops
- React state updates on every pointermove
- independent boolean soup for ritual phases
- random animation without narrative purpose
- baked image controls treated as real controls
- sign-in/sign-up labels hidden behind poetic language
- inaccessible shield-only navigation
- route navigation before interaction lock is applied
- desktop-only implementation
- motion that ignores prefers-reduced-motion
- rewriting unrelated auth, RBAC, backend, or routing logic
- inventing new routes without verifying existing routes
- replacing working authentication forms unless explicitly authorized

INTERACTION:
approach → attraction → insertion → quake → key turn →
portal opening → vault manifestation → identity choice → route transition

MOTION BUDGET:
- key attraction must feel magnetic, not cursor-following
- quake sequence should complete within approximately 650ms
- portal/vault reveal should remain responsive and non-blocking
- no perpetual high-energy animation
- idle motion must be subtle

ACCESSIBILITY:
visible Sign In and Create Account actions are mandatory
shield must be keyboard accessible
focus-visible must be preserved
Escape closes vault where appropriate
dialog focus must be trapped/restored
reduced-motion path must remain complete
screen-reader semantics must remain correct
```

---

## Source-of-truth load order — mandatory

The agent must inspect these in order before changing code or claiming completion:

```text
1. package.json
2. framework and routing structure under app/ or src/app/
3. current Lynx landing page component
4. current Lynx interaction/component tests
5. current Lynx stylesheet
6. authentication route definitions
7. authentication dialog/component implementation, if separate
8. public/lynx/lynx-laptop.png
9. public/lynx/lynx-auth-popup.png
10. any existing particle, cursor, theme, reduced-motion, or portal utilities
```

Likely files from the current implementation may include:

```text
- lynx-landing-page.tsx
- lynx-landing.css
- vanguard-landing.tsx
- vanguard-landing.interaction.test.tsx
- index.ts
```

Do not assume these names are authoritative. Locate the live imported implementation first.

The current stylesheet already contains key-cursor, proximity, keyhole quake, shield, surge, and vault-dialog concepts. Treat it as implementation evidence, not an architecture that must be preserved. 

---

## Locked experience phases

Use one explicit interaction phase model.

```text
idle
tracking
magnetized
inserted
quaking
vaultOpening
vaultOpen
departing
```

Recommended route intent:

```text
none
signin
signup
```

The exact implementation may use a reducer, finite-state machine, or equivalent discriminated union.

The implementation must make invalid transitions difficult.

Do not retain several loosely coordinated booleans such as:

```text
near
atHole
unlocked
activating
dialogOpen
navigating
```

Derived data attributes are allowed, but the authoritative interaction state must remain singular.

---

## Layer ownership

```text
L0 — matching day/night background field
L1 — static hero artwork
L2 — restrained HUD/geometric atmosphere
L3 — eye, shield, smoke, and contour enhancement
L4 — magnetic key
L5 — shield/keyhole interaction
L6 — portal reveal
L7 — Sovereign Vault
L8 — sign-in/sign-up route transition
```

Nested transform ownership must remain separated:

```text
Camera wrapper:
- earthquake displacement only

Parallax wrapper:
- pointer/parallax displacement only

Shield layer:
- local vibration and glow only

Key layer:
- magnetic position and rotation only

Portal layer:
- clip-path or mask expansion only

Vault:
- reveal/materialization only
```

Do not make several effects fight over the same `transform` property on one element.

---

## Sovereign Vault contract

```text
The Sovereign Vault replaces the ordinary small modal presentation.

It must:
- feel like an environment, not a utility card
- originate visually from the shield/keyhole
- provide visible Sign In and Create Account actions
- use the dual light/dark philosophy
- use lynx-auth-popup.png as the authoritative foreground vault artwork
- avoid presenting baked image typography as functional interface
- remain usable on mobile
- maintain correct dialog semantics
- support Escape, focus trap, and focus restoration
```

Recommended semantic treatment:

```text
SIGN IN:
- dark / protected / returning identity
- particles or HUD energy converge inward
- explicit visible label: Sign In

CREATE ACCOUNT:
- light / manifestation / creating identity
- atmosphere expands outward
- explicit visible label: Create Account
```

Poetic supporting copy is permitted.

Poetic copy must not replace clear action labels.

---

## Performance contract

```text
[ ] No setState/dispatch for every pointer coordinate
[ ] Pointer movement batched through requestAnimationFrame
[ ] CSS custom properties used for high-frequency values
[ ] No repeated layout reads and writes in the same uncontrolled loop
[ ] getBoundingClientRect results cached or recalculated intentionally
[ ] Primary motion uses transform/opacity where practical
[ ] Canvas stops or idles when not visually needed
[ ] Animation does not block auth navigation
[ ] Interaction lock prevents double activation
[ ] Event listeners and animation frames are cleaned up
[ ] No memory leaks after route change/unmount
```

---

## Definition of Done — no variance

A Lynx slice is **done** only when all applicable items are true:

```text
[ ] Live implementation files were located before editing
[ ] Existing auth routes were verified; none were invented
[ ] One authoritative ritual phase model controls the experience
[ ] Pointer motion does not rerender React continuously
[ ] Magnetic attraction and insertion are visually distinct
[ ] Key snaps to the actual rendered shield/keyhole position
[ ] Scaling/cropping math works across supported viewports
[ ] Camera quake and shield quake use separate transform owners
[ ] Quake does not exceed the agreed motion budget
[ ] Portal originates from the measured shield/keyhole location
[ ] Vault is substantially redesigned beyond the previous 34rem card
[ ] Sign In and Create Account remain explicit and discoverable
[ ] Sign In and Sign Up use distinguishable departure choreography
[ ] lynx-auth-popup.png is paired with semantic auth links over its visible CTAs
[ ] Hero artwork remains authoritative and legible
[ ] Particles enhance only selected regions
[ ] Mobile layout preserves face, eyes, shield, and actions
[ ] Keyboard flow works
[ ] Escape behavior works
[ ] Dialog focus trap/restoration works
[ ] prefers-reduced-motion path works
[ ] Existing auth behavior remains functional
[ ] Relevant unit/interaction tests pass
[ ] Production build/typecheck passes
[ ] No unrelated product or authentication scope was changed
[ ] Evidence includes commands and observed results
```

“Looks impressive” without test and interaction evidence is **FAIL**.

“Build passes” while the vault remains a generic modal is also **FAIL**.

---

## Output contract — every agent response

The coding agent must structure every response as follows:

```text
## Load confirmation
- Command:
- Project root:
- Live landing component:
- Live stylesheet:
- Test files:
- Verified auth routes:
- Assets verified:
- Files read:

## Current-state diagnosis
- Existing interaction architecture:
- Existing visual strengths:
- Existing constraints/problems:
- Reusable pieces:
- Pieces to replace:

## Assumptions
- ...
or
- none

## Plan
1. ...
2. ...
3. ...
→ Executing unless blocked by a locked-context conflict.

## Work
### Files changed
- path — purpose

### Architecture
- ritual state:
- pointer engine:
- transform ownership:
- vault:
- routing:

### Implementation notes
- ...

## Verification
### Typecheck
Command:
Result:

### Tests
Command:
Result:

### Build
Command:
Result:

### Interaction evidence
Scenario:
Given:
When:
Then:
Evidence:
Result: PASS | FAIL | BLOCKED

### Accessibility evidence
Scenario:
Given:
When:
Then:
Evidence:
Result: PASS | FAIL | BLOCKED

### Responsive evidence
Viewport:
Expected:
Observed:
Result: PASS | FAIL | BLOCKED

## DoD checklist
- [x]/[ ] each applicable Definition of Done item

## Residual gaps
- ...
or
- none

## Stop / ask
- Only include when a genuine blocker requires user input.
```

If locked context conflicts with the task, the agent must **STOP** and report the conflict.

---

# Command A — Full hybrid redesign

```text
/lynx-sovereign

COMMAND: IMPLEMENT_HYBRID_UNLOCK_RITUAL
MODE: implement the complete cinematic landing interaction
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

READ:
1. package.json
2. live landing route and component imports
3. current landing component
4. current interaction tests
5. current Lynx stylesheet
6. verified auth routes
7. public/lynx/lynx-laptop.png
8. public/lynx/lynx-auth-popup.png
9. existing animation/particle utilities

OBJECTIVE:
Transform the current Lynx landing into a cinematic hybrid unlock ritual:
approach → magnetize → insert → quake → key turn → portal →
Sovereign Vault → sign-in/sign-up transition.

DO:
1. Locate the live imported landing implementation. Do not edit dead or duplicate files.
2. Report the current interaction model before changing it.
3. Replace boolean-driven orchestration with one explicit ritual phase model:
   idle, tracking, magnetized, inserted, quaking,
   vaultOpening, vaultOpen, departing.
4. Keep pointer coordinates outside React render state.
5. Implement requestAnimationFrame + CSS-variable pointer updates.
6. Make the key magnetic:
   - free tracking when distant
   - attraction inside an outer radius
   - rotational alignment near the keyhole
   - precise snap inside insertion radius
7. Measure the rendered keyhole/shield location. Do not hard-code only 1440×810 coordinates.
8. Separate camera, parallax, shield, key, portal, and vault transform ownership.
9. Upgrade the quake:
   - camera reacts
   - shield reacts more strongly
   - key stays registered with the keyhole
   - blue eye/HUD/smoke may react subtly
   - total quake approximately <=650ms
10. Turn the key after insertion.
11. Open the portal from the measured keyhole location.
12. Replace the current small modal with a large Sovereign Vault.
13. Use /lynx/lynx-auth-popup.png as the foreground vault artwork.
14. Do not expose baked image controls as real interface.
15. Provide explicit visible actions:
   - Sign In
   - Create Account
16. Give Sign In and Create Account separate departure choreography.
17. Navigate only to verified existing auth routes.
18. Preserve immediate reduced-motion functionality.
19. Preserve keyboard access, Escape, focus trap, and focus restoration.
20. Add or update interaction tests for state transitions, keyboard use,
    reduced motion, and route selection.
21. Run typecheck, targeted tests, and production build.
22. Provide full evidence using the output contract.

VISUAL RULES:
- Hero artwork remains visible and authoritative.
- Dark half carries more digital energy.
- Light half remains calmer.
- No full-image particle dissolve.
- No generic glass-card dialog.
- No continuous noisy loop.
- Motion must communicate cause and effect.

OUT:
Use the required output contract.
Do not rewrite auth forms or unrelated backend logic.
Do not claim done without test/build/interaction evidence.
```

---

# Command B — Architecture audit only

Use this before implementation when the repository may contain multiple duplicated Lynx components.

```text
/lynx-sovereign

COMMAND: AUDIT_CURRENT_LYNX_ARCHITECTURE
MODE: evaluation only — do not write product code
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

READ:
1. package.json
2. live landing route and import chain
3. all Lynx/Vanguard landing components
4. all associated stylesheets
5. all associated tests
6. existing auth routes
7. public/lynx assets

DO:
1. Determine which component and stylesheet are actually rendered.
2. Identify duplicate, stale, dead, or experimental landing files.
3. Document the current state model and every data-* interaction attribute.
4. Document pointer-motion implementation and rerender behavior.
5. Identify transform collisions between parallax, quake, key, and shield.
6. Identify hard-coded image-coordinate assumptions.
7. Assess the current vault against the Sovereign Vault contract.
8. Assess responsive cropping at:
   - 1440×900
   - 1280×720
   - 1024×768
   - 768×1024
   - 390×844
9. Assess keyboard, dialog, Escape, focus, and reduced-motion behavior.
10. Assess existing test coverage.
11. Produce a ranked implementation plan:
    P0 architecture/safety
    P1 ritual interaction
    P2 vault/art direction
    P3 optional particle polish
12. Do not modify code.

OUT:
Use the output contract.
Replace Work with evaluation findings.
Verdict:
- READY TO IMPLEMENT
- NEEDS CLEANUP FIRST
- BLOCKED
```

---

# Command C — State machine and magnetic key only

```text
/lynx-sovereign

COMMAND: IMPLEMENT_RITUAL_ENGINE
MODE: implement interaction architecture only
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

SCOPE:
- ritual state model
- requestAnimationFrame pointer engine
- magnetic key behavior
- key insertion detection
- interaction locking
- tests

DO NOT:
- redesign the vault
- add major particle systems
- replace auth forms
- change auth routes
- redesign unrelated hero artwork

DO:
1. Locate the live implementation and verify auth routes.
2. Replace loose ritual booleans with one explicit phase model.
3. Keep high-frequency pointer values in refs/CSS variables.
4. Implement free tracking, magnetic attraction, rotational alignment,
   insertion snap, and stable keyhole registration.
5. Make thresholds configurable constants.
6. Prevent repeated insertion/unlock events.
7. Clean up requestAnimationFrame and listeners on unmount.
8. Preserve keyboard shield activation.
9. Implement reduced-motion behavior.
10. Add tests for legal state transitions and repeated activation.
11. Run typecheck and targeted tests.

ACCEPTANCE:
- no React rerender on every pointermove
- key reaches the rendered keyhole correctly
- no duplicate unlock
- keyboard path reaches the same ritual outcome
- reduced-motion path remains usable

OUT:
Use the required output contract.
Stop after the ritual engine is verified.
```

---

# Command D — Earthquake and portal choreography only

```text
/lynx-sovereign

COMMAND: IMPLEMENT_QUAKE_AND_PORTAL
MODE: implement motion choreography only
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

PREREQUISITE:
The ritual engine and insertion state must already exist and pass tests.

SCOPE:
- camera quake
- local shield quake
- key turn
- HUD/eye/smoke reaction
- keyhole-origin portal reveal
- reduced-motion equivalent

DO:
1. Confirm the existing ritual engine before editing.
2. Add separate wrappers for:
   - camera quake
   - parallax
   - shield local motion
   - key
   - portal
3. Do not stack unrelated transform animations on one node.
4. Keep key aligned with the shield during camera movement.
5. Implement a short decaying camera quake.
6. Implement stronger local shield vibration.
7. Add restrained eye, HUD, or smoke response where structurally feasible.
8. Rotate the key after insertion.
9. Measure and expose portal origin using CSS variables.
10. Expand the portal from the keyhole rather than the viewport center.
11. Keep quake duration approximately <=650ms.
12. Provide immediate or simplified reduced-motion behavior.
13. Add/update tests for phase timing and completion.
14. Run targeted tests, typecheck, and build.

FORBID:
- long dramatic shaking
- random screen shake unrelated to insertion
- portal opening from center
- broken transform composition
- continuous high-energy motion

OUT:
Use the required output contract.
Stop after quake and portal verification.
```

---

# Command E — Sovereign Vault redesign only

```text
/lynx-sovereign

COMMAND: IMPLEMENT_SOVEREIGN_VAULT
MODE: redesign authentication choice surface only
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

PREREQUISITE:
Portal/vault-open state must already be available or clearly stubbed.

ASSET:
C:\JackProject\afenda-bolt\afenda-lite\public\lynx\lynx-auth-popup.png
Runtime URL:
/lynx/lynx-auth-popup.png

SCOPE:
- vault structure
- dual light/dark identity portals
- responsive behavior
- dialog semantics
- focus management
- route selection
- departure-intent state

DO:
1. Verify live sign-in and create-account routes.
2. Replace the current small generic dialog presentation.
3. Build a large cinematic Sovereign Vault responsive to viewport size.
4. Use lynx-auth-popup.png as the authoritative foreground vault art.
5. Align semantic auth links with the artwork's visible CTA regions.
6. Provide two unmistakable real actions:
   - Sign In
   - Create Account
7. Light side represents creation/manifestation.
8. Dark side represents return/protection.
9. Preserve visible labels even when supporting copy is poetic.
10. Use semantic dialog behavior or an equivalent accessible primitive.
11. Implement:
    - initial focus
    - focus trap
    - Escape close
    - focus restoration
    - visible focus styles
12. Prevent background interaction while open.
13. Add distinct destination intent:
    - signin
    - signup
14. Do not rewrite the destination auth pages.
15. Add interaction and accessibility tests.
16. Verify mobile stacking and no-content clipping.
17. Run typecheck, tests, and build.

ACCEPTANCE VIEWPORTS:
- 1440×900
- 1024×768
- 768×1024
- 390×844

OUT:
Use the required output contract.
Do not add unrelated particle polish.
```

---

# Command F — Distinct auth route transitions

```text
/lynx-sovereign

COMMAND: IMPLEMENT_AUTH_DEPARTURES
MODE: implement sign-in/sign-up departure choreography only
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

PREREQUISITE:
Sovereign Vault is implemented and destination selection works.

SCOPE:
- sign-in departure
- create-account departure
- navigation timing
- interaction lock
- reduced-motion route behavior
- tests

DO:
1. Verify existing auth destination routes.
2. Add one departing phase with explicit destination intent.
3. For Sign In:
   - dark side gains authority
   - blue eye/HUD energy converges inward
   - transition moves toward keyhole/protected space
4. For Create Account:
   - light atmosphere expands
   - smoke/filaments open outward
   - transition communicates manifestation
5. Keep labels and route behavior correct.
6. Lock repeated input after a destination is selected.
7. Keep animation short enough that navigation feels immediate.
8. Navigate immediately when reduced motion is active.
9. Preserve browser history behavior and framework routing conventions.
10. Add tests:
    - correct destination
    - single navigation
    - reduced-motion immediate path
    - no navigation when action is cancelled before commitment, if supported
11. Run targeted tests, typecheck, and build.

FORBID:
- identical transitions for both destinations
- arbitrary timeout without cleanup
- double navigation
- invented route paths
- changing auth-page internals

OUT:
Use the required output contract.
```

---

# Command G — Particle enhancement only

```text
/lynx-sovereign

COMMAND: IMPLEMENT_RESTRAINED_PARTICLE_LAYER
MODE: optional polish after core ritual passes
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

PREREQUISITES:
- ritual engine passes
- quake and portal pass
- vault passes
- auth transitions pass
- build is green

SCOPE:
Particles may enhance only:
- dark-side facial contours
- blue eye
- ear edges
- selected smoke
- shield/keyhole
- portal transition

DO:
1. Inspect existing canvas/particle utilities before creating new ones.
2. Keep the full hero image rendered underneath.
3. Do not sample/rebuild the full cream half.
4. Prefer a prepared contour/mask approach over runtime full-image analysis.
5. Keep idle particles extremely restrained.
6. Increase energy only during magnetized, quaking, portalOpening,
   or departing phases.
7. Stop or reduce canvas work when idle, hidden, or offscreen.
8. Account for devicePixelRatio without uncontrolled memory use.
9. Disable or simplify under reduced motion.
10. Verify no measurable interaction regression.
11. Record performance evidence.
12. Run tests, typecheck, and production build.

PERFORMANCE EVIDENCE:
- animation frame strategy
- canvas resolution strategy
- pause/cleanup behavior
- no React pointer rerenders
- no obvious frame drops on target hardware

FORBID:
- full-image particle reconstruction
- permanent snow/starfield noise
- particle system becoming the primary artwork
- blocking first interaction while particles initialize

OUT:
Use the required output contract.
```

---

# Command H — Verification and acceptance only

```text
/lynx-sovereign

COMMAND: VERIFY_LYNX_ACCEPTANCE
MODE: evaluation only — no product-code changes
FOLLOW: Lynx Sovereign Landing agent command sheet
ROOT: C:\JackProject\afenda-bolt\afenda-lite

DO:
1. Locate the live landing implementation.
2. Run typecheck.
3. Run all related unit/interaction tests.
4. Run production build.
5. Verify mouse sequence:
   idle → tracking → magnetized → inserted → quaking →
   vaultOpening → vaultOpen → departing
6. Verify keyboard sequence without a pointer.
7. Verify Escape, focus trap, and focus restoration.
8. Verify Sign In destination.
9. Verify Create Account destination.
10. Verify reduced-motion behavior.
11. Verify interaction locking and no double navigation.
12. Verify responsive layouts:
    - 1440×900
    - 1280×720
    - 1024×768
    - 768×1024
    - 390×844
13. Verify face, eyes, shield, and actions remain available.
14. Verify no generic small-modal regression.
15. Verify full-image particle reconstruction is absent.
16. Verify no unrelated auth/backend changes.
17. Grade every Definition of Done row.

VERDICT:
PASS only when all mandatory DoD rows pass.
Otherwise:
FAIL + exact blocker list.

OUT:
Use the required output contract.
Do not silently fix failures.
```

---

# Anti-variance rules

Paste this after any command when the agent starts drifting:

```text
HARD RULES:
1. Do not turn the experience into a generic SaaS landing page.
2. Do not reduce the Sovereign Vault to a small centered glass card.
3. Do not rebuild the full Lynx image using particles.
4. Do not update React state on every pointermove.
5. Do not add more loosely coordinated ritual booleans.
6. Do not stack camera, parallax, shield, and key transforms on one element.
7. Do not hard-code interaction only for 1440×810.
8. Do not invent sign-in or sign-up route paths.
9. Do not rewrite auth forms or backend behavior without authorization.
10. Do not hide clear action labels behind poetic copy.
11. Do not remove keyboard, focus, Escape, or reduced-motion support.
12. Do not claim completion using screenshots alone.
13. Do not claim completion using build success alone.
14. Do not add continuous noisy motion.
15. If the live implementation or auth route is unclear: STOP and report it.
```

---

## Recommended execution order

| Goal                                                  | Command           |
| ----------------------------------------------------- | ----------------- |
| Discover live files and risks                         | **Command B**     |
| Implement the whole experience in one controlled pass | **Command A**     |
| Split implementation into safer slices                | **C → D → E → F** |
| Add particle polish only after core completion        | **Command G**     |
| Perform final acceptance                              | **Command H**     |

## Best command to paste now

For your current stage, paste **Command A**.

It authorizes the agent to redesign the interaction properly while locking the experience, architecture, performance, accessibility, and proof requirements.
