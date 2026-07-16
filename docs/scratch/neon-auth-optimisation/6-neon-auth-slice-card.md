# N7 — Post-login routing

## Objective

Route an authenticated user to the correct authorized product home after Neon
Auth succeeds, while preserving safe same-origin deep-link return behavior.

## Dependencies

- N5 Auth BFF and browser client — CLOSED
- N6 Session contract — CLOSED

## In scope

- Role-aware product-home resolver
- Safe callback URL validation
- Login success redirect
- Signed-in redirect away from `/`
- Wrong-role fail-closed behavior
- Browser verification

## Out of scope

- Permission-code expansion
- Product navigation redesign
- OAuth or magic-link adoption
- FFT phase expansion
- General route restructuring

## Acceptance criteria

- Operator/admin login ends on `/admin`
- Client login ends on `/client/dashboard`
- Authorized deep link returns to its original same-origin path
- External and protocol-relative callback URLs are rejected
- Signed-in request to `/` redirects to authorized role home
- Wrong-role shell access remains `/403`
- Redirect logic exists in one governed resolver
- Unit, integration and browser tests pass
- Web production build passes

## Verification

- package auth tests
- route/proxy tests
- redirect security tests
- authenticated browser test
- `pnpm --filter @afenda/web build`
