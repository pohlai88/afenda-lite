# `@afenda/auth` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/auth` |
| Target | `packages/control-plane/auth` |
| Kind | Control-plane kernel with server/browser execution isolation |
| Server facade | package-root `authServer` |
| Browser facade | `@afenda/auth/client` `authBrowser` |

## Ownership

Auth owns canonical session and role interpretation, active-organization binding, credential and invitation outcomes, authentication paths, and Neon Auth normalization. Errors owns failure semantics, HTTP owns transport mechanics, logger owns correlation fields, rate-limit owns quota decisions, and the application owns route/UI composition.

## Cutover rules

- Stabilize env, errors, logger, HTTP and rate-limit before auth.
- Expose exactly one server capability and one browser-safe capability.
- Treat `./client` as bundle isolation, never as a parallel version or policy owner.
- Derive shared server/browser path behavior from one internal projection.
- Keep Neon clients, unknown payload inspection, error probing and historical envelope handling inside auth.
- Fail closed when the active organization or membership role is absent; consumers cannot invent fallbacks.
- Delete standalone runtime exports, internal subpaths and public test hooks during the final cutover.
- Permit UI-only `@neondatabase/auth-ui` composition in the application; prohibit direct Neon Auth runtime imports outside the owner.
- Mutation-test export, dependency, vendor, organization-binding and browser/server boundaries.

## Verification

```bash
pnpm --filter @afenda/auth lint
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth typecheck:contract
pnpm --filter @afenda/auth test
pnpm check:auth-boundary
pnpm test:auth-boundary
pnpm --filter @afenda/admin typecheck
```

At seal, record both export surfaces, shared policy parity, hostile Neon normalization, organization fail-closed behavior, consumer cutover count, boundary mutations, focused application tests, digest, and dirty-worktree posture.
