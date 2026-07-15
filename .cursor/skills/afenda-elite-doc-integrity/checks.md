# Documentation integrity pass gates

## Pass 1 — Exact inventory

```text
- [ ] Enumerate primary files from current disk state (directory glob **or** single allowed file scope)
- [ ] Record exact primary expected/inspected counts
- [ ] Separate Markdown, artifacts, referenced dependencies, and exclusions
- [ ] Annotate tracked/untracked state without dropping untracked files
- [ ] Parse every controlled header, H1, Change Log, and outbound relative link
- [ ] Load DOC-002 seven-field register and aspect-aware authority map
- [ ] Treat Change Log **body rows** as dated history — never as Living next-pointer / program-order SSOT (header Version + latest Change Log row still must agree)
```
Any unreadable, unsupported, or parser-failed primary file makes coverage incomplete.

## Pass 2 — Structured deterministic validation

Run:

```text
node .cursor/skills/afenda-elite-doc-integrity/scripts/audit-docs.mjs \
  --scope <scope> --format json
```

Confirm:

```text
- [ ] validator exit is 0 or 1, never 2
- [ ] filename, composite ID, H1, and category agree
- [ ] all seven DOC-002 fields agree, including Title and Updated
- [ ] header version/date equals latest Change Log row
- [ ] lifecycle value is permitted
- [ ] controlled write scope was explicitly reopened under DOC-001 §3.5.1
- [ ] named locks remain independently satisfied; general reopening did not override them
- [ ] controlled sections 1–6 are present or routed to Review needed
- [ ] duplicate IDs are absent
- [ ] every relative file and generated heading anchor resolves
- [ ] generated YAML parses; every internal $ref resolves
- [ ] OpenAPI operationId, x-afenda-status, and x-afenda-document exist
- [ ] OpenAPI success/error envelopes and contract-only visibility obey authority
```

Do not use modification time as proof that a generated artifact is current.

## Pass 3 — Aspect-aware semantics

For every Living/Accepted claim and normative Draft claim, record:

```text
Subject · Aspect · Modality · Rule · Scope · Lifecycle · Source
```

Then:

```text
- [ ] compare all sources within each subject/aspect
- [ ] execute every applicable cross_subject_set from authority-map.yaml
- [ ] apply lifecycle before precedence
- [ ] re-close every controlled document after successful verification
- [ ] compare response shapes across architecture, API, REST, Draft query contract, and OpenAPI
- [ ] reject an active gate whose sole evidence authority is a Draft that disclaims enforcement
- [ ] check governance home conflicts and locks before proposing moves
- [ ] distinguish narrowing specialization and provisional Draft differences from conflicts
- [ ] describe unimplemented **in-scope** semantic comparison sets as residual risk (never a standing pairwise caveat after exit `0` when all in-scope sets are implemented)
```

A spot check is never full semantic coverage.

## Pass 4 — Resolution plan

```text
- [ ] name subject, aspect, authority, and conflicting source
- [ ] assign evidence tier independently of severity
- [ ] route controlled changes to MANUAL and locked changes to ASK-LOCK
- [ ] generate `plan-fix` before any write and validate it against the remediation schema
- [ ] require explicit `--apply`, matching hashes, unlocked target, allowlisted operation, rollback, closing audit, and idempotence for `apply-safe`
- [ ] list version, register, backlink, artifact, and lock impacts
- [ ] state repeatable verification evidence
```

## Pass 5 — Fresh verification

```text
- [ ] discard the prior inventory and rerun from current disk state
- [ ] require complete validator coverage
- [ ] rerun every touched cross-subject comparison set
- [ ] validate no new broken links, orphans, metadata drift, or artifact diagnostics
- [ ] confirm no lock scope changed without approval
- [ ] compare findings by stable evidence, not only by count
```

Do not close a finding merely because prose appears aligned.
