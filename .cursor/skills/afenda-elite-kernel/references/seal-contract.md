# Kernel seal contract

A seal is reproducible readiness evidence for one target, capability, and content digest.

## Required gates

| Gate | Pass condition |
|------|----------------|
| Authority | Owning farm, package owner, and public-contract authority are named |
| Scope | One capability and its non-goals are explicit |
| Structure | Target path, package identity, exports, scripts, and dependency rank match disk |
| Contract | Inputs, outputs, errors, compatibility class, and consumer impact are evidenced |
| Implementation | No incomplete runtime path exists in the accepted scope |
| Boundaries | Dependency, tenancy, security, data ownership, and composition rules pass where applicable |
| Tests | Behavior, rejection, and boundary cases required by the capability pass |
| Static checks | Target lint and typecheck pass |
| Consumers | Direct consumers compile or pass their focused contract tests |
| Documentation | Target README and public reference surfaces match the accepted contract |
| Snapshot | Final inspector digest and working-tree state are recorded |
| Persistence | Seal record is stored in an existing owner-approved evidence surface |

Every applicable gate must pass. Mark a non-applicable gate `N/A` with a concrete reason; never omit it silently.

## Seal record

Persist this shape in the evidence surface selected by the owning farm or user:

```yaml
kernel_seal:
  version: 1
  target: <repository-relative path>
  capability: <bounded capability>
  owner: <package or composition root>
  compatibility: internal | additive | breaking
  content_digest: <sha256>
  authority:
    - <on-disk source>
  public_contract:
    exports: [<verified export>]
    consumers: [<verified consumer>]
  gates:
    - name: <gate>
      command: <exact command or N/A>
      outcome: PASS | N/A
      evidence: <focused result>
  working_tree:
    state: clean | dirty
    target_changes: [<repository-relative path>]
  sealed_at: <ISO-8601 timestamp>
```

The timestamp is descriptive; `content_digest` is the deterministic identity. A dirty target may be sealed only when every target change is enumerated and belongs to the accepted mission.

## Seal invalidation

Reopen a seal when any of these changes:

- public export, input, output, error, or documented behavior;
- allowed dependency edge or composition root;
- security, tenancy, ownership, persistence, or observability invariant;
- required compiler, linter, test, or build configuration;
- direct consumer expectation;
- authority governing the named capability.

Re-run only demonstrably unaffected gates when their prior evidence remains valid under the current digest; explain that determination in the new record. Always rerun target lint, typecheck, tests, snapshot, and affected consumer checks.

## Refuse a seal

Return `VERIFIED` rather than `SEALED` when the implementation passes but no durable evidence surface is named. Return `BLOCKED` when a required gate cannot run, an authority conflicts with disk, ownership is unresolved, or a required result is failing.
