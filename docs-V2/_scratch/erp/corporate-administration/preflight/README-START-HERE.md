# Corporate Administration Codex Preflight Kit

Use this kit before any `CA-0.5` or `CA-1` code is changed.

## Files

- `corporate-administration-integrated-implementation-authority.md` — binding architecture and implementation authority.
- `CA-PREFLIGHT-01-CODEX-MISSION.md` — ready-to-paste Codex mission and mandatory 16-section output contract.
- `ca-preflight-readonly.sh` — optional evidence collector; writes only outside the repository by default.

## Recommended Codex start message

```text
Execute CA-PREFLIGHT-01 only.

1. Read the attached Corporate Administration implementation authority in full.
2. Read CA-PREFLIGHT-01-CODEX-MISSION.md in full and treat it as the execution contract.
3. Do not implement, scaffold, format, generate, install, migrate, commit, or modify repository files.
4. Run the read-only evidence collector where compatible, then independently inspect all relevant files and logs.
5. Return the required 16-section report, exact exit codes, completeness matrix, blocker register, and executable CA-0.5 + CA-1 plan.
6. End with the exact START AUTHORIZED or START NOT AUTHORIZED line required by the mission.

Do not ask me to reopen decisions already fixed by the authority. Where current disk evidence conflicts, report the exact file/symbol conflict and stop with NO-GO only if it is a P0 blocker.
```

## Running the collector

Place the authority at the repository path expected by the mission, or point to its actual location:

```bash
chmod +x /path/to/ca-preflight-readonly.sh
CA_AUTHORITY_FILE=/absolute/path/to/corporate-administration-integrated-implementation-authority.md \
  /path/to/ca-preflight-readonly.sh
```

To collect discovery evidence without running baseline package gates:

```bash
CA_PREFLIGHT_RUN_BASELINE_GATES=0 \
CA_AUTHORITY_FILE=/absolute/path/to/corporate-administration-integrated-implementation-authority.md \
  /path/to/ca-preflight-readonly.sh
```

The collector unsets common database connection variables and does not run DB-enabled parity tests. Evidence is written under `/tmp/ca-preflight-*` unless `CA_PREFLIGHT_OUTPUT_DIR` points to another location outside the repository.

## Interpretation

A collector exit code of `0` means only that the evidence run found the authority and did not change Git status. It is **not** the architectural readiness verdict. Codex must still complete the mission analysis and issue `GO`, `CONDITIONAL GO`, or `NO-GO`.
