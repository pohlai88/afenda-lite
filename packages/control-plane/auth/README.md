# `@afenda/auth`

Canonical authentication and organization-binding capabilities for Afenda-Lite. The package owns session semantics, roles, active organization binding, authentication paths, credential/invitation results, and Neon Auth normalization.

## Server consumption

```ts
import { authServer } from "@afenda/auth";

const session = await authServer.session.get();
const operator = await authServer.session.requireRole("operator");
const organizations = await authServer.organizations.list();
```

## Browser consumption

```ts
import { authBrowser } from "@afenda/auth/client";

const client = authBrowser.getClient();
const loginPath = authBrowser.paths.login;
```

`./client` exists solely to keep the browser bundle isolated from server dependencies. It shares canonical path policy with `authServer`; it is not a parallel API version.

## Ownership

| Concern | Owner |
|---|---|
| Sessions, roles, active organization and auth paths | `@afenda/auth` |
| Unknown Neon payload and error normalization | `@afenda/auth` |
| Error codes and transport projections | `@afenda/errors` |
| Correlation, HTTP and quota capabilities | `@afenda/logger`, `@afenda/http`, `@afenda/rate-limit` |
| Route composition and Neon Auth UI components | `apps/web` |

Consumers must not import Neon Auth runtime APIs directly, inspect vendor payloads, replace missing organization bindings, or import auth implementation files.

## Maintain

```bash
pnpm --filter @afenda/auth lint
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth typecheck:contract
pnpm --filter @afenda/auth test
pnpm check:auth-boundary
pnpm test:auth-boundary
```

See [CONTRACT.md](./CONTRACT.md).
