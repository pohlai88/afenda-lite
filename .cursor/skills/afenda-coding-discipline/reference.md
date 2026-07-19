# Afenda coding discipline — patterns

Load only the section matching a rule id from [SKILL.md](SKILL.md). Examples use Afenda shapes (`OrganizationId`, `ActionResult`, Zod). Brand table and ActionResult SSOT remain [brands-and-schemas.md](../afenda-elite-api-contract/brands-and-schemas.md) (API-003 operative) — do not fork them here.

## `brand-boundary`

Prefer api-contract brands ([brands-and-schemas](../afenda-elite-api-contract/brands-and-schemas.md)). Validate once at the boundary; downstream trusts the type.

```ts
import type { OrganizationId } from /* owning module / API types */;
import { organizationIdSchema } from /* owning Zod schema */;

function parseOrganizationId(input: unknown): OrganizationId {
  return organizationIdSchema.parse(input);
}

function requireTenantOrg(orgId: OrganizationId): void {
  // orgId is trusted — do not re-parse as raw string
}
```

Do not invent a second brand shape (`string & { readonly __brand: "OrgId" }`) when `OrganizationId` already exists.

## `union-discriminant`

```ts
// Don't — impossible states compile
type LoadState = { loading: boolean; data?: Member[]; error?: string };

// Do — only valid states
type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: Member[] }
  | { kind: "error"; error: string };

// ActionResult (API-003) — ok is the discriminant
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };
```

Prefer `ok` for ActionResult; use `kind` or `type` for domain status unions (API-003 uses `type` for submission status).

## `unknown-not-any`

```ts
// Don't
function handleInvitePayload(input: any) {
  return input.invitationId;
}

// Do
function handleInvitePayload(input: unknown): InvitationId {
  return invitationIdSchema.parse(input);
}
```

External: Action args, JSON bodies, `searchParams`, DB driver rows before schema parse, env before `@afenda/env`.

## `no-unearned-as` · `satisfies`

```ts
// Don't
const member = body as OrgMember;

// Do — Zod earns the type
const member = orgMemberSchema.parse(body);

// Config objects: validate without widening literals
const flags = {
  mode: "strict",
  retries: 3,
} satisfies RetryFlags;
```

Earned `as` after a full schema parse (same pattern as API-003 brand helpers) is acceptable at the brand constructor only.

## `narrowing-order` · type guards

```ts
function messageFor(result: ActionResult<Member>): string {
  if (result.ok) return result.data.email;
  return result.message;
}

function isReady(s: LoadState): s is Extract<LoadState, { kind: "ready" }> {
  return s.kind === "ready";
}
```

Guards must verify the claim. Prefer discriminant narrowing when enough.

## `exhaustive-never`

```ts
function labelFor(status: SubmissionStatus): string {
  switch (status.type) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "LOCKED":
      return "Locked";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
```

## `boundary-then-trust` · `schema-derived`

```ts
// Boundary (Server Action / route handler)
const input = createMemberSchema.parse(raw);

// Inside — trust inferred type; do not re-declare a drifting interface
type CreateMemberInput = z.infer<typeof createMemberSchema>;

// Derive instead of hand-duplicating
type MemberSummary = Pick<Member, "id" | "email" | "role">;
```

Zod under the owning module is executable validation SSOT (API-004 / ARCH-029). Do not add a parallel hand-written interface.

## `immutable-updates` · `early-return` · `named-constants`

```ts
const MAX_INVITES_PER_BATCH = 50;

function appendInvite(list: Invite[], next: Invite): Invite[] {
  if (list.length >= MAX_INVITES_PER_BATCH) {
    throw new Error("invite batch limit exceeded");
  }
  if (!next.email) {
    throw new Error("email required");
  }
  return [...list, next];
}

// React state — functional update
setMembers((curr) => [...curr, member]);
```

## `correctness-hygiene`

```ts
// Don't — silent impossible branch
if (session) {
  return renderApp(session);
} else {
  // "shouldn't happen"
}

// Do — explicit failure
if (!session) {
  throw new Error("invariant: session required after auth gate");
}
return renderApp(session);
```

Delete unused exports/imports. Comments explain WHY (policy, ordering, invariant) — never WHAT or chat provenance.

## `object-args`

```ts
// Prefer
inviteOrgMember({ organizationId, email, role });

// Avoid positional swaps on multi-arg domain APIs
inviteOrgMember(organizationId, email, role);
```

Skip object-wrapping on hot loops (render-frame, parsers).
