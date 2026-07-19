# Server Actions (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/actions.md` |
| Authority | **Scratch** — api-and-interface-design + disk `apps/web/app/actions/**` |
| Updated | 2026-07-20 |

UI mutation adapters only. Contract: `ActionResult<T>` (`ok: true | false`) — see [README.md](README.md). RH paths stay in [rest.md](rest.md). Re-probe disk after Action add/remove — do not invent rows.

---

## api-now (disk)

| File | Export(s) | Owning context | Role |
|------|-----------|----------------|------|
| `auth-credentials.ts` | `signInAction` · `signOutAction` | identity (+ `@afenda/auth`) | Email sign-in → `ActionResult`; sign-out redirects (`void`) |
| `permission-gate.ts` | `forbidUnlessPermission` | identity | Shared Action denial helper → `ActionFailure \| null` |
| `invite-org-member.ts` | `inviteOrgMemberAction` | identity | Org invite mutation |
| `assign-org-role.ts` | `assignOrgRoleAction` | identity | Assign org role (+ audit path) |
| `revoke-org-role.ts` | `revokeOrgRoleAction` | identity | Revoke org role (+ audit path) |
| `provision-organization.ts` | `provisionOrganizationAction` | platform | Org provision |
| `delete-organization.ts` | `deleteOrganizationAction` | platform | Org delete |
| `get-organization-usage.ts` | `getOrganizationUsageAction` | platform | Org usage read |

Paths are under `apps/web/app/actions/`. Authz + Zod inside each mutation Action — proxy alone is not authz.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No tutorial `{ success, data }` envelopes | Breaks `ActionResult` consumers ([README.md](README.md)) |
| No SQL in Actions | Thin adapters → `modules/*/domain` |
| No invented Action files | Catalogue = disk only |
| Not OpenAPI | Actions are same-origin UI mutations; YAML is RH api-now only |
