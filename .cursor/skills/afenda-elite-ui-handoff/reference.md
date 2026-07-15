# UI handoff — reference

Companion to [SKILL.md](SKILL.md). Read when running the DevTools gate or diagnosing handroll/drift.

## Chrome DevTools MCP (this repo)

Prefer project server: `project-0-afenda-lite-chrome-devtools` (or the name listed in `.vscode/mcp.json` / Cursor MCP).

Minimum tool sequence before handoff:

| Step | Tool (typical) | Pass criteria |
|------|----------------|---------------|
| 1 | `list_pages` / `new_page` | Session exists |
| 2 | `navigate_page` | Target URL 200 / app shell loads |
| 3 | `take_snapshot` | Expected landmarks / labels visible |
| 4 | `list_console_messages` | No unexpected `error` severity |
| 5 | `list_network_requests` | No failed first-party document/XHR for the surface |

Optional: `take_screenshot` for visual regression notes; `lighthouse_audit` when performance is in scope.

Method library prose: [browser-testing-with-devtools](../agent-skills/skills/browser-testing-with-devtools/SKILL.md).

## Handroll path ban (quick)

```text
apps/web/features/playground/**
apps/web/app/playground/**
apps/web/components/**
**/features/*/shadcn-studio/**
packages/design-system/**/shadcn-studio/**   # after promote — delete residue
```

## Gateway allowlist

Import only:

- `@afenda/ui`
- `@afenda/ui/style.css`
- `@afenda/ui/playground`
- `@afenda/ui/playground/providers`
- `@afenda/ui/playground/types`

## When DevTools cannot run

If MCP server is down or there is no runnable URL:

1. State the blocker in the handoff report.
2. Do **not** claim visual verification passed.
3. Fix env / start `pnpm --filter @afenda/web dev` / restore MCP — then re-run the gate.

Never substitute “looks fine in code review” for DevTools on a UI turn.
