# Corporate Administration — Future Permission Catalog

This file is a governed design artifact only. CA-0.1 runtime code ships an empty permission catalog:

```ts
export const CORPORATE_ADMINISTRATION_PERMISSION_CODES = [] as const;
```

Activate permissions incrementally with the commands and queries that require them. Do not seed proposed permissions ahead of an implemented operation and coverage test.

## Naming rules

- Use `corporate_administration.<resource>.<action>`.
- Prefer singular resource nouns.
- Split actions only where risk, approval, segregation-of-duties, or sensitive-data exposure differs.
- Do not let `corporate_administration.module_admin` silently bypass high-risk domain permissions.

## Proposed normalized catalog

```text
corporate_administration.company.read
corporate_administration.company.create
corporate_administration.company.update
corporate_administration.company.activate
corporate_administration.company.dissolve

corporate_administration.establishment.read
corporate_administration.establishment.manage

corporate_administration.governance.read
corporate_administration.governance.manage

corporate_administration.officer.read
corporate_administration.officer.appoint
corporate_administration.officer.update
corporate_administration.officer.cease

corporate_administration.meeting.read
corporate_administration.meeting.manage

corporate_administration.resolution.read
corporate_administration.resolution.draft
corporate_administration.resolution.approve
corporate_administration.resolution.record_effect

corporate_administration.authority.read
corporate_administration.authority.manage
corporate_administration.authority.publish
corporate_administration.seal.manage

corporate_administration.capital.read
corporate_administration.capital.structure_manage
corporate_administration.capital.transaction_record
corporate_administration.capital.transaction_reverse

corporate_administration.ownership.read
corporate_administration.ownership.manage

corporate_administration.ubo.summary.read
corporate_administration.ubo.sensitive.read
corporate_administration.ubo.manage
corporate_administration.ubo.attest

corporate_administration.distribution.declare

corporate_administration.asset.read
corporate_administration.asset.manage
corporate_administration.licence.manage
corporate_administration.charge.manage
corporate_administration.bank_account.read
corporate_administration.bank_account.manage
corporate_administration.bank_mandate.manage

corporate_administration.group.read
corporate_administration.group.manage
corporate_administration.related_party.manage
corporate_administration.agreement.manage
corporate_administration.corporate_action.manage
corporate_administration.corporate_action.approve_effect

corporate_administration.document.read
corporate_administration.document.manage
corporate_administration.register.certify
corporate_administration.compliance_rule.manage
corporate_administration.filing.read
corporate_administration.filing.manage
corporate_administration.filing.waive

corporate_administration.import.prepare
corporate_administration.import.approve
corporate_administration.import.apply
corporate_administration.export.standard
corporate_administration.export.sensitive
corporate_administration.reconcile
corporate_administration.module_admin
```

## Activation notes

- `import.prepare`, `import.approve`, and `import.apply` stay separate to support segregation of duties.
- UBO reads split summary from sensitive access so field-level redaction and sensitive-access audit trails are possible.
- Capital terminology avoids ledger-owned words like `post` unless the activated slice proves Corporate Administration owns the statutory capital ledger semantics.
- `module_admin` is for module settings, rule-pack/reference configuration, diagnostics, and activation controls. It must not automatically grant capital transactions, bank-mandate changes, UBO sensitive access, dissolution, or sensitive exports.
