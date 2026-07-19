# Documentation integrity reference

## Contents

- [Taxonomy](#taxonomy)
- [Severity](#severity)
- [Evidence tiers](#evidence-tiers)
- [Fix routing](#fix-routing)
- [Finding output](#finding-output)

## Taxonomy

Assign exactly one primary category. Mention secondary relationships in evidence.

| Code | Meaning |
| --- | --- |
| `AUTH-DUP` | Same binding rule has multiple normative owners |
| `SSOT-CONFLICT` | Incompatible authoritative claims on the same comparison set |
| `SSOT-AMBIGUOUS` | Relevant authorities disagree and no aspect-aware precedence resolves them |
| `REGISTER-DRIFT` | Any of the seven DOC-002 fields differs from the document |
| `HEADER-DRIFT` | Filename, ID, H1, or internal header identity differs |
| `LIFECYCLE-ERROR` | Invalid lifecycle Status, invalid Control State, or active authority depends on non-enforcing lifecycle material |
| `STRUCTURE-DRIFT` | Controlled sections/header form violates DOC-001/DOC-003 without a resolved exception (includes missing Control State where required) |
| `CATEGORY-ERROR` | ID prefix and category disagree |
| `HOME-ERROR` | One resolved governing authority places a document elsewhere |
| `SEQUENCE-DRIFT` | Reading or work order contradicts a locked roadmap |
| `REFERENCE-BROKEN` | Relative file or anchor target is absent |
| `REFERENCE-ORPHAN` | Subordinate document lacks required inbound/parent relationship |
| `REFERENCE-CYCLE` | Governance dependencies form an unresolved authority cycle |
| `SCOPE-OVERLAP` | Child repeats rather than narrows parent authority |
| `SCOPE-GAP` | Required responsibility has no owner |
| `TERMINOLOGY-DRIFT` | Competing terms identify one controlled concept |
| `VERSION-DRIFT` | Header, register, artifact, or latest Change Log version/date differs |
| `ARTIFACT-DRIFT` | Generated artifact is missing, invalid, semantically incomplete, or inconsistent |
| `LOCK-VIOLATION` | Proposed or actual change crosses a protected decision scope |
| `STALE-CLAIM` | Content or Change Log claims a transfer/state that is no longer true |
| `ARCH-MISALIGNMENT` | Subordinate contract conflicts with governing architecture |
| `UNCONTROLLED-AUTHORITY` | Unregistered/navigation content states binding rules |
| `COVERAGE-MISSTATEMENT` | Report claims files, checks, or semantic coverage not proven by its ledger |

## Severity

Use the highest directly supported impact; do not multiply undefined factors.

| Severity | Decision rule |
| --- | --- |
| **Critical** | Incompatible implementation/security/release behavior can result from following either authority |
| **High** | Living authority, lifecycle gate, identity, home, or generated contract is materially unreliable |
| **Medium** | Findability, structure, ownership, stale transfer, or reference failure impairs governed use |
| **Low** | Exact metadata/title/editorial mismatch with limited operational impact |
| **Info** | Non-finding observation; exclude from finding counts unless requested |

## Evidence tiers

| Tier | Gate |
| --- | --- |
| **Confirmed** | Parser-backed deterministic evidence, or direct contradiction with all relevant sources loaded |
| **Supported** | Semantic match is strong and subject/aspect/lifecycle are resolved |
| **Review needed** | Interpretation or authority decision remains; propose options without declaring a winner |
| **Observation** | No violation established |

Coverage is not an evidence tier. A validator exit `2` prohibits a clean result.

## Fix routing

| Route | Permitted action |
| --- | --- |
| `AUTO` | Allowlisted navigation-only repair with a deterministic replacement, unlocked target, hashes, rollback, and closing audit |
| `SEMI` | Approved mechanical work that still needs controlled review |
| `MANUAL` | Controlled metadata/prose, authority, lifecycle, structure, contract, or artifact change |
| `ASK-LOCK` | Any move, reorder, reopen, retirement, ID, or path change inside a lock |

Register synchronization, controlled prose deletion, controlled home moves, and generated semantic changes are never `AUTO`.

The only implemented `AUTO` operation is `unlink-missing-navigation-target` on `README.md`: retain the link label as plain text when its relative file target does not exist. All other routes remain plan-only until separately implemented and tested.

## Finding output

Every finding must match the validator report schema:

| Field | Required meaning |
| --- | --- |
| Finding ID | Stable `DOC-CONS-NNN` within the sorted report |
| Severity | Critical / High / Medium / Low / Info |
| Evidence tier | Confirmed / Supported / Review needed / Observation |
| Category | One taxonomy code |
| Subject | Authority-map subject or cross-subject set |
| Authority aspect | Exact aspect used to resolve precedence |
| Authority | Winning source or unresolved competing sources |
| Conflicting source | Losing, subordinate, or mismatched source |
| Evidence | Direct parser/claim evidence; no unsupported “none” assertions |
| Risk | Concrete consequence |
| Fix type | AUTO / SEMI / MANUAL / ASK-LOCK |
| Proposed resolution | One controlled action or explicit decision options |
| Version/Register impact | Every controlled record affected |
| Lock status | Unlocked, unresolved, or named lock owner |
| Verification | Repeatable closure evidence |
| Validator evidence | File/line/check identifiers supporting the result |

Completion reports must separately list primary scope, dependencies, artifacts, exclusions, and residual semantic coverage.

`residualRisk` is evidence-based:

| Condition | Residual risk text |
| --- | --- |
| Coverage incomplete | Validation coverage is incomplete; do not claim a clean audit. |
| Zero findings; all in-scope comparison sets implemented | `None.` |
| Zero findings; unimplemented in-scope sets remain | Zero findings on executed checks. Human pairwise review still required for unimplemented in-scope comparison sets: \<ids\>. |
| Findings remain | `Findings remain (see report).` — plus unimplemented set ids when applicable. |

Out-of-scope dimensions (external HTTP availability; code-to-document runtime drift) stay on the coverage ledger only — never as residual risk after a clean in-scope run.
Do not emit a standing pairwise caveat when coverage is complete, findings are zero, and every in-scope authority-map comparison set is implemented.

## Known baselines (do not reopen as rename debt)

| Scope | Baseline | Disposition |
| --- | --- | --- |
| Living `docs/**` (any) | **N/A** while tree absent (docs-V2 Scratch era) | Do not invent Living trees; CLI skips; fixtures under `scripts/` are test doubles only |
| `docs/guides` full profile (when Living restored) | **0** findings (navigator + Living GUIDE-017) | GUIDE-017 cross-cutting evidence authority; do not restore `docs/guides/archive/` |
| `docs/api` / FFT module packs (when Living restored) | Zero findings when coverage complete | Living rename/verify bar |

