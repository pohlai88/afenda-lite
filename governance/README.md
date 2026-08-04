# `governance`

Kernel package register, enforcement contracts, and governance check scripts for Afenda-Lite.

## Who it is for

Maintainers and agents changing the kernel package register, enforcement profiles, or `pnpm check:kernel-governance`. Package authors consume doctrine projections under `packages/KERNEL-GOVERNANCE.md` — not this tree as a workspace import.

## Stability

`Internal` — repository governance tooling; not a publishable `@afenda/*` package. Shape may change with kernel-register missions; treat `pnpm check:kernel-governance` as the compatibility contract.

## Requires

- Node `24.x` | pnpm `>=10.33.4` (root `package.json` engines)
- Repo-local tooling tree — not an `@afenda/*` workspace package

## Consume

This tree (`governance`) is **not** a publishable `@afenda/*` package.

Use it through the repository scripts or entry points listed under **Maintain**. Do not treat a repo-local folder as a package export boundary.

## Quickstart

```bash
pnpm check:kernel-governance
```

Expect a clean report when the register, disk packages, and doctrine projections agree.

## Maintain

| Command | Purpose |
| --- | --- |
| `pnpm check:kernel-governance` | `pnpm exec tsx governance/scripts/check-kernel-governance.mts` |

### Testing

```bash
pnpm test:repo-tooling
```

Includes `governance/scripts/__tests__/check-kernel-governance.test.mjs` via the repo-tooling Vitest project.

### Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `check:kernel-governance` fails on register parity | Disk package missing or band/path drift | Align `governance/kernel/package-registry.ts` with on-disk `packages/**` and re-run the gate |
| Doctrine projection mismatch | `KERNEL-GOVERNANCE.md` / `KERNEL-PRD-INDEX.md` out of sync | Align projections with validator expectations |
| Unknown enforcement profile/gate | Profile or gate id not in contracts | Add the declaration under `governance/kernel/enforcement-*.ts` or remove the reference |

## Boundaries

| Owns | Does not own |
| --- | --- |
| Kernel package identity register (`governance/kernel/`), enforcement contracts/profiles, and the kernel governance check script | Product runtime packages, Living DOC-001 spines, ERP scaffolding body copy, UI shells |

## Authority

| Topic | Link |
| --- | --- |
| Kernel register | [`kernel/`](./kernel/) |
| Governance scripts | [`scripts/`](./scripts/) |
| Agent instructions | [`AGENTS.md`](../AGENTS.md) |
| Documentation map | [`docs/README.md`](../docs/README.md) |
| Kernel doctrine | [`packages/KERNEL-GOVERNANCE.md`](../packages/KERNEL-GOVERNANCE.md) |
| PRD index projection | [`packages/KERNEL-PRD-INDEX.md`](../packages/KERNEL-PRD-INDEX.md) |
| README template kit | [`docs/template/readme/`](../docs/template/readme/README.md) |

## Support

| Topic | Where |
| --- | --- |
| Owning surface | Kernel governance maintainers (architecture + package owners per `packages/KERNEL-GOVERNANCE.md`) |
| Changelog | Not package-local; record material register changes in the owning PR |
| Report an issue | Repository issue tracker for `afenda-lite` |

## License

UNLICENSED — repository-local tree (not a published package).
