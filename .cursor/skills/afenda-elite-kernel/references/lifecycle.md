# Kernel lifecycle

Use one state transition per bounded mission. A state describes evidence, not ambition.

## States

| State | Meaning | Required evidence |
|-------|---------|-------------------|
| `ABSENT` | Target path does not exist | Verified parent and intended package identity |
| `DISCOVERED` | Target exists and its contract is inventoried | Inspector snapshot and consumer search |
| `SCAFFOLDED` | Complete compilable package shape exists | Package metadata, barrel, implementation, tests, README, and scripts required by its farm |
| `IMPLEMENTED` | Named capability works through its public contract | Behavior and boundary tests |
| `APPLIED` | Existing kernel contract is integrated into a named target | Consumer wiring and integration evidence |
| `CUT_OVER` | One frozen semantic contract has replaced all accepted legacy surfaces | Complete consumer migration, deletion set, and recurrence gates |
| `UPGRADED` | Existing capability changed under an explicit compatibility class | Before/after contract diff and affected consumer updates |
| `VERIFIED` | All required gates for the mission are green | Exact commands, outcomes, and final digest |
| `SEALED` | Verified evidence is persisted against a digest | Complete seal record |
| `REOPENED` | A prior seal is invalidated by an accepted delta | Prior seal, delta classification, and affected gates |
| `BLOCKED` | A required authority or decision is unavailable | Exact blocker and decision needed |

## Modes

### `scaffold`

Start from `ABSENT`. Verify the package name, directory band, owner, dependency rank, exports, scripts, and consumer intent. Finish only with a compilable and testable package shape; never emit empty implementations.

### `apply`

Integrate an established kernel contract into one target. Verify the source contract and target boundary independently. Keep target-specific composition outside the kernel package when it depends on higher-rank services.

### `implement`

Add a bounded capability without changing accepted public behavior outside the mission. Add validation, errors, observability, and tests where the capability boundary requires them.

### `cutover`

Replace distributed or parallel semantic ownership in one authorized final
migration. Enter only when the canonical owner, permanent facade, normalization
boundary, derived projections, consumer rules, and deletion set are frozen.

Separate the work into two passes:

1. mechanical imports and equivalent call shapes;
2. semantic classification of dynamic data and domain-owned context.

Finish only when all accepted consumers use the permanent surface, every
superseded public path is deleted, and repository checks reject reintroduction.
Do not create an intermediate public API or treat a compatibility alias as a
second construction surface.

### `upgrade`

Compare the prior contract to the requested contract before editing. Classify the change:

| Class | Meaning |
|-------|---------|
| `internal` | Public inputs, outputs, and behavior remain equivalent |
| `additive` | New public capability does not invalidate accepted consumers |
| `breaking` | Existing consumers or documented behavior must change |

For `breaking`, name and update every accepted consumer in the same mission unless authority requires a coordinated multi-mission cutover.

### `verify`

Make no feature changes. Reproduce required gates against the current digest and report focused failures with evidence.

### `seal`

Make no product behavior changes. Verify the final digest, required gates, consumer evidence, and durable record. A seal with any missing required field is invalid.

### `reopen`

Run before changing a sealed target. Record the prior digest, accepted delta, compatibility class, affected evidence, and next bounded mode.

## Transition rules

```text
ABSENT     -> SCAFFOLDED -> IMPLEMENTED -> VERIFIED -> SEALED
DISCOVERED -> IMPLEMENTED -> VERIFIED -> SEALED
DISCOVERED -> APPLIED     -> VERIFIED -> SEALED
DISCOVERED -> CUT_OVER    -> VERIFIED -> SEALED
DISCOVERED -> UPGRADED    -> VERIFIED -> SEALED
SEALED     -> REOPENED    -> IMPLEMENTED | APPLIED | CUT_OVER | UPGRADED -> VERIFIED -> SEALED
any state  -> BLOCKED when required authority or ownership is unresolved
```

Do not skip `VERIFIED`. Do not use `SEALED` as a synonym for “merged,” “complete,” or “ready” outside the named capability and digest.
