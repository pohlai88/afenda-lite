# AGENTS.md — {{PACKAGE_NAME}}

Package-local deltas for agents. Root [`AGENTS.md`]({{ROOT_AGENTS_REL}}) wins for
checkout-wide doctrine. This file wins only for **conflicts inside this package**.

## Package

| Field | Value |
| --- | --- |
| Name | `{{PACKAGE_NAME}}` |
| Path | `{{PACKAGE_REL}}` |
| Primary command | `{{PRIMARY_COMMAND}}` |

## Deltas (only)

- _List package-specific bans, ports, or verify commands that differ from root._
- _Do not restate PREFLIGHT, UI barrel, env, or farm router rules._

## Verify

```bash
{{PRIMARY_COMMAND}}
```

Prefer `pnpm --filter {{PACKAGE_NAME}} lint|typecheck|test` over broad root suites.

## Authority

| Topic | Link |
| --- | --- |
| Package README | [`README.md`](./README.md) |
| Package docs | [`docs/`](./docs/) when present |
| Root agents | [`AGENTS.md`]({{ROOT_AGENTS_REL}}) |
