# Shadcn Studio blocks (local)

Installed from `@ss-blocks` (base-nova) via:

```bash
npm run studio:install-block -- <block-slug>
```

## Canonical kit

SSOT: [`lib/studio-canonical-kit.ts`](../../lib/studio-canonical-kit.ts)  
Storybook: **UI Evaluation / Studio Canonical Kit**

| Block | Role in portal |
|-------|----------------|
| `login-page-02` | Layout reference only — Guardian + Neon AuthView in prod |
| `form-layout-01/02/08` | Portal form patterns (already wrapped) |
| `empty-state-01` | Prefer `PortalEmptyStateCard` |
| `account-settings-01` | Chrome reference — Neon AccountView owns forms |
| datatable / statistics | Admin + client data surfaces |

Do not replace Neon credential or account forms with Studio demo forms.
