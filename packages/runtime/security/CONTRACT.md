# Security kernel contract

`@afenda/security` is the canonical framework-neutral owner of CSP serialization, baseline and strict security-header policy, and explicit-allow-list CORS policy.

The permanent consumer surface is the package-root `security` capability. Header projections use `{ name, value }`; Fetch application is built in, while framework adapters translate that neutral representation at their composition boundary. In particular, Next.js `{ key, value }` adaptation belongs exclusively to `apps/web/next.config.ts`.

CSP directive names and values, configurable header values, HSTS ages, CORS origins, methods, header names, and max ages are validated before projection. CORS rejects wildcard, non-origin, and unsafe inputs and fails closed for unlisted request origins.

There is no alias policy because these are in-process capabilities rather than persisted or wire semantic values. The final cutover deletes all flat functions/constants and every Next-named type/function from the package surface. Repository gates prevent runtime workspace edges, deep imports, parallel facades, Next.js leakage, and duplicated application policy.
