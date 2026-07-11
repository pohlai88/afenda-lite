# REST resources

Plural nouns, HTTP methods as verbs. Query params `camelCase`. One version.

**Columns**

- **api-now** — implement (or already implemented) as `app/api/**` Route Handlers  
- **contract-only** — resource contract for future external clients; **web UI uses RSC + Server Actions today**

## api-now (Route Handlers)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/health/liveness` | Process up | public |
| GET | `/api/health/readiness` | DB / deps ready | public |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon |
| GET/PUT/PATCH | `/api/client/declaration-draft` | Draft autosave (POST = keepalive alias) | client session |

Do not add same-origin “list declarations” GETs under `/api` for the dashboard — use RSC → domain.

## contract-only (portal core)

Shapes below are the **canonical REST contract**. UI adapters call the same domain functions without HTTP.

### Clients

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/clients` | List (paginated) |
| GET | `/api/clients/:clientId` | Detail |
| POST | `/api/clients/invitations` | Issue invite |
| DELETE | `/api/clients/:clientId` | Remove registration |

### Declarations (surveys)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/declarations` | Operator list |
| POST | `/api/declarations` | Create |
| GET | `/api/declarations/:declarationId` | Detail |
| PATCH | `/api/declarations/:declarationId` | Update metadata / questions |
| DELETE | `/api/declarations/:declarationId` | Delete |

### Assignments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/assignments/:assignmentId` | Client assignment + questions |
| POST | `/api/assignments/:assignmentId/submissions` | Submit answers |
| PUT | `/api/assignments/:assignmentId/draft` | Save draft (also api-now path today) |

### Share links

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/declarations/:declarationId/share-links` | Create / rotate |
| GET | `/api/public/surveys/:slug` | Open link read model |
| GET | `/api/public/secure-links/:token` | Secure link read model |
| POST | `/api/public/secure-links/:token/submissions` | Public submit |

### Account

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/account` | Current member profile summary |
| PATCH | `/api/account` | Update allowed fields (if not Neon-owned) |

Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate.

### Pagination (lists)

```http
GET /api/declarations?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

## Feed Farm Trade appendix (contract-only, gated)

Web UI uses `app/actions/fft.ts` on locale-free `/fft/*` (AdminCN). HTTP below is contract-only until an external consumer needs it — **no `:locale` segment**.

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/fft/events` | List / create events |
| GET/PATCH | `/api/fft/events/:eventId` | Detail / setup |
| POST | `/api/fft/events/:eventId/orders` | Submit order |
| POST | `/api/fft/events/:eventId/allocations` | Run allocation |
| GET/POST | `/api/fft/events/:eventId/deposits` | Deposits |
| GET/POST | `/api/fft/events/:eventId/pickups` | Pickup windows / fulfill |
| POST | `/api/fft/events/:eventId/imports` | Import dry-run / apply |
| GET/POST | `/api/fft/rbac/...` | Roles / assignments |
| POST | `/api/fft/erp-sync/...` | Sync jobs |

Web UI continues via `app/actions/fft.ts` until an external consumer needs HTTP.

## Naming

| Pattern | Convention |
|---------|------------|
| Paths | Plural nouns, no verbs in path |
| IDs | Path params; UUID strings |
| Booleans | `is` / `has` / `can` prefixes in JSON |
| Enums | `UPPER_SNAKE` in JSON wire format |

## Related

- [03-error-contract.md](03-error-contract.md)  
- [05-schema-map.md](05-schema-map.md)  
- [../frontend/04-bff-and-data.md](../frontend/04-bff-and-data.md)  
