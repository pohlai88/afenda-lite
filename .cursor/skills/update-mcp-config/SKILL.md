---
name: update-mcp-config
description: >-
  Adds or edits workspace MCP server config like update-cursor-settings — read
  first, preserve existing servers, one SSOT file, no duplicate mcp.json dumps.
  Use when installing MCP, editing mcp.json, adding Neon/shadcn/chrome-devtools/
  next-devtools servers, or when the user mentions MCP config sprawl.
---

# Updating MCP Config

Mirror `/update-cursor-settings`: **read → preserve → edit one file → validate**. Never scatter MCP configs.

## SSOT (this repo)

| Role | Path | Format key |
|------|------|------------|
| **Canonical (edit this)** | `.cursor/mcp.json` | `mcpServers` |
| VS Code parity (optional sync only) | `.vscode/mcp.json` | `servers` |
| **Forbidden** | `.mcp.json` (repo root) | — |
| **Forbidden** | Any new `**/mcp.json` or `*mcp*.json` invented by agents | — |

Cursor agents load **`.cursor/mcp.json`**. Do not create a fourth path. Do not “helpfully” reinstall the same servers into `.vscode/` or root unless the user explicitly asks for VS Code parity sync.

## Before modifying

1. **Read** `.cursor/mcp.json` (full file).
2. **Inventory** existing server ids — never drop one unless the user asks to remove it.
3. **Check sprawl** — if `.mcp.json` or a duplicate exists, do **not** write into it; tell the user and prefer deleting/ignoring it after consolidating into `.cursor/mcp.json`.
4. **Preserve** all unrelated servers and env/header values.

## Workflow (same shape as update-cursor-settings)

### Step 1 — Read current config

```text
Read: .cursor/mcp.json
```

### Step 2 — Identify the change

| User intent | Action |
|-------------|--------|
| Add a server | Insert one key under `mcpServers`; keep others |
| Update URL / args / env | Patch that server only |
| Remove a server | Delete that key only |
| “Install MCP” with no path | Edit `.cursor/mcp.json` only |
| VS Code needs same servers | Sync `.vscode/mcp.json` **from** `.cursor/mcp.json` (remap `mcpServers` → `servers`); do not invent extras |

### Step 3 — Write back

- Valid JSON, 2-space indent.
- Preserve existing formatting style of the file when practical.
- Neon: keep `Authorization: Bearer ${NEON_API_KEY}` and project URL already in file unless user changes project.
- Do **not** put secrets in mcp.json — only `${ENV_VAR}` references.
- Do **not** add dead/local Storybook MCP (`localhost:6006`) unless Storybook is running and user asked.

### Step 4 — Confirm

Tell the user:

1. Which file was edited (must be `.cursor/mcp.json` unless they asked for VS Code sync).
2. Which server id was added/changed/removed.
3. **Reload MCP / restart Cursor** if servers do not appear (same as settings restart note).

## Hard bans

- Creating `.mcp.json` at repo root
- Copying the full server list into a second/third file “for safety”
- Writing MCP server defs into `settings.json`, `AGENTS.md`, or random `.cursor/*.json`
- Committing real API keys into mcp headers
- Leaving one-shot install scripts that regenerate duplicate mcp files

## Formats

**Cursor (canonical):**

```json
{
  "mcpServers": {
    "example": {
      "command": "npx",
      "args": ["-y", "some-mcp@latest"]
    }
  }
}
```

**VS Code (parity only — key is `servers`, not `mcpServers`):**

```json
{
  "servers": {
    "example": {
      "command": "npx",
      "args": ["-y", "some-mcp@latest"]
    }
  }
}
```

HTTP servers use `"type": "http"`, `"url"`, optional `"headers"`.

## Sprawl cleanup (when user asks)

1. Merge unique servers into `.cursor/mcp.json`.
2. Optionally sync `.vscode/mcp.json` (`servers` shape).
3. Delete `.mcp.json` at repo root.
4. Confirm only **one or two** files remain (Cursor + optional VS Code).

## Workspace vs user

| Scope | Where |
|-------|--------|
| This project | `.cursor/mcp.json` (and optional `.vscode/mcp.json`) |
| All projects | Cursor **User** MCP settings (UI) — do not invent a user-level file from agents unless the user names that path |

## Verification

- [ ] Read `.cursor/mcp.json` before write
- [ ] No new mcp config path created
- [ ] Existing servers preserved
- [ ] JSON valid
- [ ] User told to reload MCP / restart Cursor if needed
