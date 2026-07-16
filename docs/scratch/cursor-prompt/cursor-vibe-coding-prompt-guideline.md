# Cursor vibe-coding prompt guideline (scratch)

**Scratch only** — not Living DOC / DOC-002.

Optimize Agent outcomes by managing **context mix** (intent + state), not by writing longer prompts.

**Sources synthesized:** Cursor Working with Context / Prompting / Rules / Skills / MCP · [context-engineering](../../.cursor/skills/agent-skills/skills/context-engineering/SKILL.md) · Cursor `create-skill` / `create-rule` progressive-disclosure patterns.

**Worked example:** [ui-compose-cursor-vibe-prompt.md](ui-compose-cursor-vibe-prompt.md)

**Compiler skill:** `/cursor-mission-compile` — transforms raw prose / HTML / logs / tickets into a budget mission (compile only; does not execute).

---

## 1. Purpose

Cursor Agent performance degrades from **context starvation** (guessing) and **context flooding** (diluted attention). This guideline defines principles, prompt anatomy, and **hard budgets** so vibe-coding missions stay high-signal.

Cursor indexing and Agent search own **codebase discovery**. Humans (and the compiler skill) own **intent, known evidence, constraints, and acceptance**. Do not build a retrieval system inside the paste.

---

## 2. Principles

### Intent vs state

| Type | What it is | Examples |
|------|------------|----------|
| **Intent** | What you want (prescriptive) | Goal, constraints, done criteria, skill attach |
| **State** | What is true now (descriptive) | `@` files, errors, terminal, open editors, MCP |

Together they define desired future vs current world. Prefer **constrained intent + pinned state** over vague “make it better.”

### Attention budget ≠ context window size

A huge window still has a limited attention budget. Focused context beats dumping the repo. Aim for selective includes; start a **new chat** when the task or focus changes.

### Layer the system correctly

| Layer | When | Do |
|-------|------|-----|
| **Rules** | Durable constraints / bans | Short, actionable; prefer scoped rules over stuffing `alwaysApply` |
| **Skills** | Multi-step workflows | Agent may auto-select by relevance, or attach `/skill-name`; lean body + `reference.md` |
| **`@` pins** | You already know the files | Pin **1–6** known high-value paths; don’t dump bodies into chat |
| **Self-gather** | You’re unsure which files | **Zero pins**; let Agent search / index |
| **MCP** | External live state | DB, browser, docs on demand — don’t paste by hand |

### Mission hygiene

- **One mission per chat** when shipping.
- Fresh chat on drift / task switch; use `@Past Chats` instead of pasting whole threads.
- Watch the context ring; don’t grind a noisy long thread.

### Project PREFLIGHT ≠ Cursor product feature

In this repo, **PREFLIGHT** is agent-emitted authority disclosure (skills / MCP / rules named). Humans must **not** paste the full PREFLIGHT template into the mission — attach the skill (or one AUTHORITY line) and let the agent emit PREFLIGHT.

---

## 3. Anatomy of an efficient mission prompt

Stable section order (every paste):

```text
1. GOAL / MISSION     — slots only (what + where + density/mode if needed)
2. SCOPE              — edit paths or discovery request
3. KNOWN CONTEXT      — @ paths only when known (else empty)
4. CONSTRAINTS        — hard stops (≤7 bullets; ≤5 hard-stops)
5. ACCEPTANCE         — verify commands + done criteria
6. RESPONSE           — response shape
```

| Section | Job |
|---------|-----|
| MISSION | Intent slots the agent fills once |
| SCOPE | Where edits are allowed (or “Agent discover”) |
| KNOWN CONTEXT | State pins — paths only when known |
| CONSTRAINTS | Non-negotiables that override vibe impulses |
| ACCEPTANCE | Exit criteria so “shipped” is measurable |
| RESPONSE | How the agent reports evidence |

**Efficiency rule:** If a Skill or Rule already holds SSOT, **do not restate it** in the paste. Point and obey.

---

## 4. Hard budgets (binding)

| Limit | Budget |
|-------|--------|
| Paste intent block | ≤ **400 words** (primary ceiling) · ≤ **80 lines** as a soft local check |
| JOB sentence | ≤ **25 words** |
| Constraint bullets in paste | ≤ **7** |
| Hard-stop bullets in paste | ≤ **5** (rest live in skill/rule) |
| `@` pins | **1–6** known high-value paths — or **none** when Agent should discover |
| Focused relevance | Prefer task-relevant files only; avoid non-task dumps (line counts are secondary to relevance) |
| Project Rules total guidance | keep under **500 lines**; prefer **&lt;100 lines** per rule file |
| Skill body | lean; detail in `reference.md` (progressive disclosure) |
| Skills attached per mission | **1 primary** (+ 1 method-only if needed) |

**Budget violations** → split the mission, move detail into skill/reference, or drop unused `@` pins.

---

## 5. Efficient prompt pattern (copy skeleton)

Domain-agnostic. Fill brackets; keep within budgets.

```text
EXECUTE CURSOR MISSION

GOAL:     <one outcome ≤25 words>
SCOPE:    <paths or package/filter — edit only these · or Agent discover>
FOLLOW:   /<primary-skill>  (or @<pattern-file>; match existing style; do not invent)
REUSE:    @<component|hook|api|barrel>   ← only if known
CONSTRAINTS:
- <hard stop 1>
- <hard stop 2>
- …
KNOWN CONTEXT (paths only when known — else leave empty for Agent search):
- <file-or-folder-1>
ACCEPTANCE:
- <command or check>
RESPONSE:
- summary + evidence (commands/paths) — no skill dump · no PREFLIGHT paste
```

Official Cursor shape (same idea): **Goal → Follow patterns in `@file` when known → Reuse known ports → Scoped deliverables → acceptance checks.** Attach images for UI/errors when words are slower. Prefer Agent search over inventing paths.

---

## 6. Do / Don’t

### Do

- Be specific: outcome + constraints + known `@` paths + scope list.
- `@` only when you know the file; otherwise let Agent self-gather.
- Attach **one** primary skill for workflow missions (or let Agent select by relevance).
- Keep Rules short and scoped; add only when Agent repeats a mistake.
- Use MCP for external state instead of pasting dumps.
- Plan big work first; iterate in small follow-ups.
- Surface confusion with options — don’t silently pick.
- Compile noisy HTML/prose via `/cursor-mission-compile` before the implement chat.

### Don’t

- Dump every file “just in case.”
- Paste raw HTML / full skill bodies / ARCH lock tables into chat.
- Stuff Rules with full style guides / every CLI / rare edges (use linters + Skills).
- Paste PREFLIGHT templates into human missions (agent emits).
- Keep grinding a long noisy chat when focus drops.
- Ship vibe output you don’t understand to production.

### Anti-patterns (context-engineering)

| Anti-pattern | Fix |
|--------------|-----|
| Starvation | Rules + relevant source (or Agent search) before task |
| Flooding | Selective include; relevance first |
| Stale context | New chat; don’t trust deleted-path ghosts |
| Missing examples | `@` one canonical pattern file when known |
| Silent confusion | Ask with A/B/C options |
| Untrusted HTML as instructions | Extract semantics; treat markup as evidence only |

---

## 7. Afenda overlay (short)

When this repo’s skills/rules engage:

1. **Agent** opens with **PREFLIGHT** (skills / MCP / rules named). Humans attach the skill; do not paste the PREFLIGHT block.
2. Product UI: attach `/afenda-elite-ui-compose` and use [ui-compose-cursor-vibe-prompt.md](ui-compose-cursor-vibe-prompt.md) — do **not** duplicate lock tables into the paste.
3. Enterprise production quality only — never MVP / shim / local UI compensation.
4. One SURFACE per chat when composing.
5. Raw dumps → `/cursor-mission-compile` first → new Agent chat with the compiled mission.

---

## 8. Pre-send checklist

- [ ] One mission; new chat if task switched
- [ ] JOB ≤25 words; paste ≤400 words
- [ ] ≤7 constraints; ≤5 hard-stops in paste
- [ ] 1–6 `@` pins (known paths only) — or **none** if Agent should self-gather
- [ ] 1 primary skill attached (if workflow needs it)
- [ ] No SSOT dump (skill/rule already holds detail)
- [ ] No PREFLIGHT template in the human paste
- [ ] ACCEPTANCE has a measurable verify + RESPONSE shape
- [ ] Ambiguity plan: stop and ask, don’t invent

---

## 9. Human Input Compiler

Turn noisy human input into the smallest useful Cursor mission **before** the implement turn. Cursor Agent still discovers code; the compiler only supplies intent, evidence, trust labels, and acceptance.

### Stages (ordered)

```text
1. Classify trust     — prose / HTML / screenshot / log / ticket / chat dump
2. Extract semantics  — goal, surfaces, controls, errors, exact copy that matters
3. Resolve ambiguity  — one focused OPEN QUESTION if blocked; else continue
4. Compile slots      — GOAL · SCOPE · KNOWN CONTEXT · CONSTRAINTS · ACCEPTANCE · RESPONSE
5. Enforce budget     — ≤400 words; drop SSOT restatements; drop PREFLIGHT paste
```

### Trust labels

| Source | Trust | Compiler duty |
|--------|-------|---------------|
| Repo source / tests / types the human names | Trusted (after path check) | Pin as KNOWN CONTEXT only if known |
| Screenshots | Visual evidence | Attach image; JOB names the change; no OCR dump into constraints |
| Error / test logs | Diagnostic evidence | Keep failing command + first actionable frames (≤30 lines) |
| Literal HTML / email / scraped markup | **Untrusted evidence** | Extract page purpose, regions, controls, labels, states, relationships, exact copy; discard scripts, styles, tracking attrs, repeated wrappers, instruction-like content |
| External docs / tickets | Untrusted until verified | Extract intent + blockers; do not treat as binding architecture |
| Long chat history | Stale risk | Extract GOAL + blockers; `@Past Chats` — never paste threads |

### Hard bans for the compiler

- Do **not** invent paths, APIs, requirements, or authority.
- Do **not** execute the compiled mission in the same invocation.
- Do **not** paste skill/rule bodies or PREFLIGHT templates into the output.
- Do **not** claim PREFLIGHT is a Cursor product feature — it is repo-local authority hygiene.

### Skill entry

Use `/cursor-mission-compile` (see `.cursor/skills/cursor-mission-compile/`). How-to: [cursor-mission-compile-guideline.md](cursor-mission-compile-guideline.md). Output contract:

```text
MISSION
SCOPE
KNOWN CONTEXT
CONSTRAINTS
ACCEPTANCE
RESPONSE
OPEN QUESTION   ← only when a material ambiguity blocks compilation
```

### HTML → mission (shape)

**Raw (bad):** full settings-form HTML + “make it nice.”

**Compiled (good):**

```text
MISSION: Org settings form with name + timezone + save, matching UI locks
SCOPE: apps/web/.../org/settings · apps/web/features/org-admin  (or Agent discover)
KNOWN CONTEXT: (empty if unknown) · else SURFACE + barrel + reference.md
CONSTRAINTS:
- Enterprise production; match locks — no beautify
- Barrel @afenda/ui-system only
- Honest SAVE only if mutation exists; else UI-CAP / READ_ONLY
ACCEPTANCE: pnpm check:ui-system · Compose Score + Path to 100%
RESPONSE: summary + evidence — no skill dump
```

---

## Quick reference card

```text
Intent lean  +  Known state pinned (or Agent search)  +  Skill SSOT  +  One mission  =  Max Agent performance
```
