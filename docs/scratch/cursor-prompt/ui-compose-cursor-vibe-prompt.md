# Afenda UI Compose — Cursor vibe prompt (scratch)

**Scratch only** — not Living DOC / DOC-002.

**Budgets:** [cursor-vibe-coding-prompt-guideline.md](cursor-vibe-coding-prompt-guideline.md) (≤400 words paste · ≤7 constraints · ≤5 hard-stops · 1–6 known `@` pins or none).

**Authority (SSOT — do not duplicate into chat):**

- Attach `/afenda-elite-ui-compose` (covers SKILL; do not also `@` SKILL.md)
- Agent emits project **PREFLIGHT** (do not paste the PREFLIGHT template into the mission)
- ADR-010 · ARCH-024 `#afendaui-system` · barrel + `tokens.css`

## How to use (Cursor)

1. **New Agent chat** — one SURFACE per mission.
2. Attach **`/afenda-elite-ui-compose`**.
3. **`@`-pin only when known (≤4 typical):**
   - `.cursor/skills/afenda-elite-ui-compose/reference.md`
   - `packages/ui-system/src/index.ts`
   - SURFACE route + feature files under `apps/web/`
4. **When locks/tokens at risk (add ≤2; total `@` ≤6):**
   - `packages/ui-system/src/styles/tokens.css`
   - ADR-010 **or** `.cursor/rules/ui-system.mdc`
5. If paths are unknown → **zero pins**; let Agent search.
6. Fill **MISSION** slots → paste **PROMPT** once.
7. Raw HTML / ticket dump first? Run `/cursor-mission-compile`, then paste the compiled mission.

---

## PROMPT (copy from here)

```text
EXECUTE AFENDA UI COMPOSE — CURSOR MISSION

ATTACH: /afenda-elite-ui-compose
(Agent emits project PREFLIGHT — do not paste PREFLIGHT here)

### MISSION (fill every slot)
MODE:     <COMPOSE | AUDIT>
SURFACE:  <apps/web route and/or features path>
JOB:      <outcome ≤25 words>
DENSITY:  <comfortable | compact>   ← XOR; one per page
RECIPE:   <settings|crud|sheet|destroy|notice|metrics|chrome|command|kv|loading|empty|auto>

### CONSTRAINTS (≤7; hard-stops ≤5)
- Enterprise production; match locks — do NOT beautify
- Greenfield apps/web/** + packages/* only; no Collapse recover
- import { … } from "@afenda/ui-system" only — no handroll / no apps/web/components/ui/**
- No p-8 (F2); no rogue titles (F3); no fake CTA (F1); no bordered tabular <ul> (F4)
- No Dialog-for-destroy; no clickable Card; nav = Button asChild + Link
- No local capability compensation (rule 15); no silent barrel API change (rule 12)
- Skill is SSOT — do not restate SKILL/reference; QUALITY ORDER: AUTHORITY→…→STABILITY

### KNOWN CONTEXT (paths only when known; else leave empty for Agent search)
Always when known: reference.md · packages/ui-system/src/index.ts · SURFACE files
When needed (≤2 more): tokens.css · ADR-010 or ui-system.mdc

### FIRST ACTIONS
1. Read SURFACE files to change.
2. Confirm exports in packages/ui-system/src/index.ts.
3. Capability gate (skill/reference) — CAPABLE compose; else UI-CAP / honest LIST_ONLY|READ_ONLY; no substitute. Missing primitive → ui:add → barrel → tests → feature.
4. Run MODE → verify → Compose Score.

### MODE
COMPOSE: gate → DENSITY+RECIPE (or auto) → edit only JOB files under SURFACE → verify → score
AUDIT: no code changes → score SURFACE vs QUALITY ORDER + F*/C* + UI-CAP → Path to 100%

### ACCEPTANCE
Floor: pnpm check:ui-system (matrix may require axe / representative non-auth route / web build). Grep ≠ done.
Done when: (1) SCALABILITY clear (2) stability green (3) Compose Score emitted.
Blocked → UI-CAP finding (reference.md template); do not ship substitute.

### RESPONSE
Compose Score: <N>% / 100% + Path to 100% (≤2 sentences, file/port language).
Caps: F*≤70 · C*≤75 · fake≤60 · local compensation≤50+STABILITY=0 · no matrix→STABILITY=0
```

---

## Anti-vibe appendix (highest-frequency)

| Vibe impulse | Required recovery |
|--------------|-------------------|
| “Make it prettier” | Match locks only. |
| “Quick custom Button/Input” | Barrel; missing → `ui:add` → barrel → tests. |
| “Bordered list for now” | DataTable or UI-CAP — never F4. |
| “Disable CTA until API exists” | Honest LIST_ONLY / READ_ONLY or UI-CAP-07. |
| “Dialog for delete” | AlertDialog + destructive Button (C1). |
| “Clickable Card” | Actions via Button/Link inside (C3). |
| “Ship without Score / checks” | Incomplete — floor + Compose Score required. |

## Example fill

```text
MODE:     COMPOSE
SURFACE:  apps/web/app/(operator)/org/settings · apps/web/features/org-admin
JOB:      Org profile settings with name + timezone fields and save
DENSITY:  comfortable
RECIPE:   settings
```
