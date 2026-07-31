# `@afenda/auth` contract

## Semantic owner

`@afenda/auth` owns canonical session and role interpretation, active-organization binding, authentication paths, credential and invitation normalization, and the Neon Auth boundary.

## Permanent consumer facades

- Server consumers import `authServer` from `@afenda/auth`.
- Browser consumers import `authBrowser` from `@afenda/auth/client`.

The client subpath is an execution-isolation boundary, not a second semantic implementation. Both facades share the same internal path policy. Standalone runtime functions, vendor clients, test reset hooks, and implementation subpaths are not public.

## Normalization boundary

Unknown Neon responses and failures are inspected and normalized inside this package. Consumers receive canonical sessions, organization membership, invitation results, or canonical `@afenda/errors` failures; they do not inspect vendor payloads.

Session organization binding is fail closed. A consumer cannot substitute an organization identifier when the canonical session has no active organization.

## Prohibited surfaces

- Direct `@neondatabase/auth` runtime imports outside this package.
- Auth implementation subpaths other than the authorized browser-safe `./client` entry.
- Consumer-owned Neon response/error interpretation or organization fallback logic.
- Parallel named runtime exports alongside `authServer` or `authBrowser`.
- Browser code importing server-only auth capabilities.
