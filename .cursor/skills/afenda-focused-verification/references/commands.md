# Verification Commands

Use focused commands during edit loops.

| Surface | Command |
| --- | --- |
| Package lint | `pnpm --filter @afenda/<package> lint` |
| Package typecheck | `pnpm --filter @afenda/<package> typecheck` |
| Package tests | `pnpm --filter @afenda/<package> test` |
| Single package spec | `pnpm --filter @afenda/<package> test -- <pattern>` |
| Module/register/schema ownership | `pnpm validate:modules` |
| OpenAPI | `pnpm check:openapi` |
| Editor posture | `pnpm check:editor-biome` |

Broad commands require explicit operator approval or `AFENDA_ALLOW_BROAD_VERIFY=1`:

- `pnpm test`
- `pnpm check`
- `pnpm build:check`
- `pnpm exec turbo run lint typecheck test`
- `turbo run lint typecheck test build`
