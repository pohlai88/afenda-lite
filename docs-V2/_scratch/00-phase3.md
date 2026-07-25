# Phase 3 Coding Guide — Audit, Event and Correlation Integrity

## Mission verdict

Implement Phase 3 without redesigning the HR command/store architecture.

The target is:

```text
Every HR mutation
→ has one registry declaration
→ always creates an audit fact
→ may emit only registered domain events
→ carries organization, operation and correlation context
→ is validated against @afenda/events
```

The existing registry covers only about 31% of the command inventory, while time already demonstrates complete emission classification.

---

# 1. Final architectural authority

## Declaration owner

`@afenda/human-resources` owns:

* command-to-emission classification;
* command-to-event-type mapping;
* audit requirements;
* correlation requirements;
* aggregate and domain ownership.

## Event-schema owner

`@afenda/events` owns:

* event type identifiers;
* versioned payload schemas;
* common event envelope;
* schema parsing;
* event catalog metadata.

## Emission execution owner

The existing Memory and Drizzle adapters remain responsible for executing audit/outbox writes.

This preserves:

* transactional audit writes;
* transactional outbox writes;
* adapter parity;
* idempotency behavior;
* existing Neon transaction boundaries.

Do **not** move database outbox writes to `apps/web`.

## Product owner

`apps/web` supplies:

* actor context;
* organization context;
* operation ID;
* correlation ID;
* causation ID;
* idempotency key.

---

# 2. Recommended file structure

Keep the existing public registry file, but split implementation by concern.

```text
packages/erp/human-resources/src/
├── mutation-emission-registry.ts
├── emissions/
│   ├── types.ts
│   ├── define-emission.ts
│   ├── registry.ts
│   ├── resolve-emission.ts
│   ├── validate-emission.ts
│   ├── mutation-outcome.ts
│   └── domains/
│       ├── leave.ts
│       ├── workforce-foundation.ts
│       ├── core-organization.ts
│       ├── recruitment.ts
│       ├── lifecycle.ts
│       ├── employee-relations.ts
│       ├── compliance.ts
│       ├── talent.ts
│       ├── workforce-planning.ts
│       ├── compensation.ts
│       ├── performance.ts
│       └── learning.ts
```

The existing file becomes the compatibility entry point:

```ts
// mutation-emission-registry.ts

export {
  HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
  getHumanResourcesMutationEmission,
  validateHumanResourcesMutationEmissionRegistry,
} from "./emissions/registry";

export type {
  HumanResourcesMutationEmissionDefinition,
  HumanResourcesEmissionMode,
} from "./emissions/types";
```

---

# 3. Registry type design

## `emissions/types.ts`

Use a discriminated union so invalid combinations cannot compile.

```ts
import type {
  HumanResourcesCommandId,
} from "../module-ids";

import type {
  HumanResourcesEventType,
} from "@afenda/events";

export type HumanResourcesEmissionMode =
  | "audit_only"
  | "domain_event";

interface HumanResourcesEmissionBase {
  commandId: HumanResourcesCommandId;

  /**
   * All HR mutations must produce an audit fact.
   */
  auditRequired: true;

  /**
   * Correlation is mandatory for all mutations.
   */
  correlationRequired: true;

  /**
   * Domain owner used for validation and documentation.
   */
  domain:
    | "workforce-foundation"
    | "core"
    | "organization"
    | "recruitment"
    | "lifecycle"
    | "leave"
    | "time"
    | "compensation-benefits"
    | "performance"
    | "learning"
    | "talent"
    | "compliance"
    | "employee-relations"
    | "workforce-planning";

  aggregateType: string;
}

export interface HumanResourcesAuditOnlyEmission
  extends HumanResourcesEmissionBase {
  emissionMode: "audit_only";
  eventTypes: readonly [];
}

export interface HumanResourcesDomainEventEmission
  extends HumanResourcesEmissionBase {
  emissionMode: "domain_event";

  /**
   * Domain-event commands must declare at least one event.
   */
  eventTypes: readonly [
    HumanResourcesEventType,
    ...HumanResourcesEventType[],
  ];
}

export type HumanResourcesMutationEmissionDefinition =
  | HumanResourcesAuditOnlyEmission
  | HumanResourcesDomainEventEmission;
```

## Why this shape matters

This must fail compilation:

```ts
{
  commandId,
  emissionMode: "audit_only",
  eventTypes: ["human-resources.leave.approved.v1"],
}
```

This must also fail:

```ts
{
  commandId,
  emissionMode: "domain_event",
  eventTypes: [],
}
```

---

# 4. Definition helpers

## `emissions/define-emission.ts`

```ts
import type {
  HumanResourcesCommandId,
} from "../module-ids";

import type {
  HumanResourcesEventType,
} from "@afenda/events";

import type {
  HumanResourcesAuditOnlyEmission,
  HumanResourcesDomainEventEmission,
} from "./types";

interface CommonDefinition {
  domain:
    HumanResourcesAuditOnlyEmission["domain"];
  aggregateType: string;
}

export function defineAuditOnlyEmission(
  commandId: HumanResourcesCommandId,
  definition: CommonDefinition,
): HumanResourcesAuditOnlyEmission {
  return {
    commandId,
    emissionMode: "audit_only",
    eventTypes: [],
    auditRequired: true,
    correlationRequired: true,
    domain: definition.domain,
    aggregateType: definition.aggregateType,
  };
}

export function defineDomainEventEmission(
  commandId: HumanResourcesCommandId,
  definition: CommonDefinition & {
    eventTypes: readonly [
      HumanResourcesEventType,
      ...HumanResourcesEventType[],
    ];
  },
): HumanResourcesDomainEventEmission {
  return {
    commandId,
    emissionMode: "domain_event",
    eventTypes: definition.eventTypes,
    auditRequired: true,
    correlationRequired: true,
    domain: definition.domain,
    aggregateType: definition.aggregateType,
  };
}
```

---

# 5. Registry design

Use a record keyed by command ID, not an array.

A record prevents duplicate command declarations.

## `emissions/registry.ts`

```ts
import type {
  HumanResourcesCommandId,
} from "../module-ids";

import {
  HUMAN_RESOURCES_LEAVE_EMISSIONS,
} from "./domains/leave";

import {
  HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS,
} from "./domains/workforce-foundation";

import {
  HUMAN_RESOURCES_CORE_ORGANIZATION_EMISSIONS,
} from "./domains/core-organization";

import {
  HUMAN_RESOURCES_RECRUITMENT_EMISSIONS,
} from "./domains/recruitment";

import {
  HUMAN_RESOURCES_LIFECYCLE_EMISSIONS,
} from "./domains/lifecycle";

import {
  HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS,
} from "./domains/employee-relations";

import {
  HUMAN_RESOURCES_COMPLIANCE_EMISSIONS,
} from "./domains/compliance";

import {
  HUMAN_RESOURCES_TALENT_EMISSIONS,
} from "./domains/talent";

import {
  HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS,
} from "./domains/workforce-planning";

import type {
  HumanResourcesMutationEmissionDefinition,
} from "./types";

export const HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY = {
  ...HUMAN_RESOURCES_LEAVE_EMISSIONS,
  ...HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS,
  ...HUMAN_RESOURCES_CORE_ORGANIZATION_EMISSIONS,
  ...HUMAN_RESOURCES_RECRUITMENT_EMISSIONS,
  ...HUMAN_RESOURCES_LIFECYCLE_EMISSIONS,
  ...HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS,
  ...HUMAN_RESOURCES_COMPLIANCE_EMISSIONS,
  ...HUMAN_RESOURCES_TALENT_EMISSIONS,
  ...HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS,
} satisfies Partial<
  Record<
    HumanResourcesCommandId,
    HumanResourcesMutationEmissionDefinition
  >
>;
```

During the incremental rollout, use `Partial<Record<...>>`.

At the end of Phase 3, change it to:

```ts
export const HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY = {
  // All domain registries
} satisfies Record<
  HumanResourcesCommandId,
  HumanResourcesMutationEmissionDefinition
>;
```

That final type change is the compile-time completion gate.

---

# 6. Registry resolver

## `emissions/resolve-emission.ts`

```ts
import type {
  HumanResourcesCommandId,
} from "../module-ids";

import {
  HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
} from "./registry";

import type {
  HumanResourcesMutationEmissionDefinition,
} from "./types";

export function getHumanResourcesMutationEmission(
  commandId: HumanResourcesCommandId,
): HumanResourcesMutationEmissionDefinition {
  const definition =
    HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY[
      commandId
    ];

  if (!definition) {
    throw new Error(
      `HR mutation command is not classified: ${commandId}`,
    );
  }

  return definition;
}
```

A production mutation must never continue without a registry entry.

---

# 7. Correlation contract

## Extend the canonical mutation metadata

Use the existing `shared/mutation-meta.ts` as the single owner.

```ts
export interface HumanResourcesMutationMeta {
  operationId: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;

  organizationId: string;
  actorUserId: string;

  requestedAt: string;
}
```

## Validation

```ts
export function assertValidHumanResourcesMutationMeta(
  meta: HumanResourcesMutationMeta,
): void {
  if (!meta.organizationId.trim()) {
    throw new Error(
      "Human Resources mutation organizationId is required.",
    );
  }

  if (!meta.operationId.trim()) {
    throw new Error(
      "Human Resources mutation operationId is required.",
    );
  }

  if (!meta.correlationId.trim()) {
    throw new Error(
      "Human Resources mutation correlationId is required.",
    );
  }

  if (!meta.actorUserId.trim()) {
    throw new Error(
      "Human Resources mutation actorUserId is required.",
    );
  }

  if (!meta.idempotencyKey.trim()) {
    throw new Error(
      "Human Resources mutation idempotencyKey is required.",
    );
  }
}
```

## Required relationship

The same values must flow into both audit and event records:

```text
Audit correlationId = Event correlationId
Audit operationId   = Event operationId
Audit actorUserId   = Event actorUserId
Audit organization  = Event organization
```

---

# 8. Mutation outcome helper

Create one shared helper for validating audit and event behavior.

## `emissions/mutation-outcome.ts`

```ts
import type {
  HumanResourcesCommandId,
} from "../module-ids";

import type {
  HumanResourcesMutationMeta,
} from "../shared/mutation-meta";

import type {
  HumanResourcesEventType,
} from "@afenda/events";

import {
  getHumanResourcesMutationEmission,
} from "./resolve-emission";

export interface HumanResourcesMutationOutcome {
  commandId: HumanResourcesCommandId;
  meta: HumanResourcesMutationMeta;

  aggregateType: string;
  aggregateId: string;

  audit: {
    action: string;
    changes: readonly unknown[];
  };

  event?: {
    type: HumanResourcesEventType;
    payload: Readonly<Record<string, unknown>>;
  };
}

export function validateHumanResourcesMutationOutcome(
  outcome: HumanResourcesMutationOutcome,
): void {
  const definition =
    getHumanResourcesMutationEmission(
      outcome.commandId,
    );

  if (
    definition.aggregateType !==
    outcome.aggregateType
  ) {
    throw new Error(
      [
        "HR mutation aggregate mismatch.",
        `Command: ${outcome.commandId}`,
        `Expected: ${definition.aggregateType}`,
        `Received: ${outcome.aggregateType}`,
      ].join(" "),
    );
  }

  if (
    definition.emissionMode === "audit_only" &&
    outcome.event
  ) {
    throw new Error(
      `${outcome.commandId} is audit-only and cannot emit ${outcome.event.type}.`,
    );
  }

  if (
    definition.emissionMode === "domain_event" &&
    !outcome.event
  ) {
    throw new Error(
      `${outcome.commandId} requires a domain event.`,
    );
  }

  if (
    outcome.event &&
    !definition.eventTypes.includes(
      outcome.event.type,
    )
  ) {
    throw new Error(
      [
        `Undeclared HR event ${outcome.event.type}.`,
        `Command: ${outcome.commandId}.`,
        `Allowed: ${definition.eventTypes.join(", ")}.`,
      ].join(" "),
    );
  }
}
```

---

# 9. Shared adapter emission executor

Use one helper in both Memory and Drizzle adapters.

```ts
export interface HumanResourcesMutationPorts {
  audit: HumanResourcesAuditPort;
  outbox: HumanResourcesOutboxPort;
}
```

## Generic executor

```ts
export async function emitHumanResourcesMutationOutcome(
  outcome: HumanResourcesMutationOutcome,
  ports: HumanResourcesMutationPorts,
): Promise<void> {
  assertValidHumanResourcesMutationMeta(
    outcome.meta,
  );

  validateHumanResourcesMutationOutcome(
    outcome,
  );

  await ports.audit.record({
    organizationId:
      outcome.meta.organizationId,

    operationId:
      outcome.meta.operationId,

    correlationId:
      outcome.meta.correlationId,

    causationId:
      outcome.meta.causationId,

    actorUserId:
      outcome.meta.actorUserId,

    commandId:
      outcome.commandId,

    aggregateType:
      outcome.aggregateType,

    aggregateId:
      outcome.aggregateId,

    action:
      outcome.audit.action,

    changes:
      outcome.audit.changes,

    occurredAt:
      outcome.meta.requestedAt,
  });

  if (!outcome.event) {
    return;
  }

  await ports.outbox.publish({
    organizationId:
      outcome.meta.organizationId,

    operationId:
      outcome.meta.operationId,

    correlationId:
      outcome.meta.correlationId,

    causationId:
      outcome.meta.causationId,

    actorUserId:
      outcome.meta.actorUserId,

    eventType:
      outcome.event.type,

    aggregateType:
      outcome.aggregateType,

    aggregateId:
      outcome.aggregateId,

    payload:
      outcome.event.payload,

    occurredAt:
      outcome.meta.requestedAt,
  });
}
```

For Drizzle, call this helper through transaction-aware audit/outbox ports.

Do not perform independent outbox writes outside this helper.

---

# 10. Slice 3.1 — Leave emission registry

The leave audit found 18 leave mutations and zero leave registry declarations.

## Classification rule

Use:

```text
Draft/configuration maintenance
→ audit_only

Published policy or employee-affecting state transition
→ domain_event
```

## Recommended leave classification

| Mutation category                 | Recommended mode |
| --------------------------------- | ---------------- |
| Create draft leave policy         | `audit_only`     |
| Amend draft leave policy          | `audit_only`     |
| Change draft eligibility          | `audit_only`     |
| Publish policy                    | `domain_event`   |
| Retire policy                     | `domain_event`   |
| Create entitlement                | `domain_event`   |
| Amend entitlement                 | `domain_event`   |
| Adjust entitlement balance        | `domain_event`   |
| Expire entitlement                | `domain_event`   |
| Close entitlement                 | `domain_event`   |
| Create draft request              | `audit_only`     |
| Submit request                    | `domain_event`   |
| Amend submitted request           | `domain_event`   |
| Approve request                   | `domain_event`   |
| Reject request                    | `domain_event`   |
| Cancel request                    | `domain_event`   |
| Withdraw request                  | `domain_event`   |
| Restore or reverse request impact | `domain_event`   |

Map this table to the exact 18 constants currently exported from `module-ids.ts`.

## `emissions/domains/leave.ts`

Use the exact command symbols from the repository.

```ts
import {
  HUMAN_RESOURCES_LEAVE_COMMAND_IDS,

  HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
  HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_AMEND,
  HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
  HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_RETIRE,

  HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CREATE,
  HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_AMEND,
  HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,

  HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
  HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
  HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
  HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
  HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL,
} from "../../module-ids";

import {
  HUMAN_RESOURCES_EVENT_LEAVE_POLICY_PUBLISHED,
  HUMAN_RESOURCES_EVENT_LEAVE_POLICY_RETIRED,
  HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_CREATED,
  HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_AMENDED,
  HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_ADJUSTED,
  HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_SUBMITTED,
  HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_AMENDED,
  HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_APPROVED,
  HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_REJECTED,
  HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_CANCELLED,
} from "@afenda/events";

import {
  defineAuditOnlyEmission,
  defineDomainEventEmission,
} from "../define-emission";

import type {
  HumanResourcesMutationEmissionDefinition,
} from "../types";

type LeaveCommandId =
  (typeof HUMAN_RESOURCES_LEAVE_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_LEAVE_EMISSIONS = {
  [HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE]:
    defineAuditOnlyEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
      {
        domain: "leave",
        aggregateType: "leave_policy",
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_AMEND]:
    defineAuditOnlyEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_AMEND,
      {
        domain: "leave",
        aggregateType: "leave_policy",
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
      {
        domain: "leave",
        aggregateType: "leave_policy",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_POLICY_PUBLISHED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_RETIRE]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_RETIRE,
      {
        domain: "leave",
        aggregateType: "leave_policy",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_POLICY_RETIRED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CREATE]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CREATE,
      {
        domain: "leave",
        aggregateType: "leave_entitlement",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_CREATED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_AMEND]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_AMEND,
      {
        domain: "leave",
        aggregateType: "leave_entitlement",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_AMENDED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
      {
        domain: "leave",
        aggregateType: "leave_entitlement",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_ENTITLEMENT_ADJUSTED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
      {
        domain: "leave",
        aggregateType: "leave_request",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_SUBMITTED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
      {
        domain: "leave",
        aggregateType: "leave_request",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_AMENDED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
      {
        domain: "leave",
        aggregateType: "leave_request",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_APPROVED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
      {
        domain: "leave",
        aggregateType: "leave_request",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_REJECTED,
        ],
      },
    ),

  [HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL]:
    defineDomainEventEmission(
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL,
      {
        domain: "leave",
        aggregateType: "leave_request",
        eventTypes: [
          HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_CANCELLED,
        ],
      },
    ),

  /*
   * Add the remaining exact leave command IDs here.
   * The Record type below prevents closing the mission
   * until all 18 are declared.
   */
} satisfies Record<
  LeaveCommandId,
  HumanResourcesMutationEmissionDefinition
>;
```

The exact constant names must match the current `module-ids.ts`. Do not create duplicate command IDs merely to match this guide.

## Leave event naming

Prefer business facts:

```text
human-resources.leave-policy.published.v1
human-resources.leave-policy.retired.v1
human-resources.leave-entitlement.created.v1
human-resources.leave-entitlement.amended.v1
human-resources.leave-entitlement.adjusted.v1
human-resources.leave-request.submitted.v1
human-resources.leave-request.amended.v1
human-resources.leave-request.approved.v1
human-resources.leave-request.rejected.v1
human-resources.leave-request.cancelled.v1
```

Avoid generic events such as:

```text
human-resources.leave-record.updated.v1
```

---

# 11. Leave adapter integration

## Before

An adapter may currently do something similar to:

```ts
await audit.record(...);
await outbox.publish(...);
```

## After

```ts
await emitHumanResourcesMutationOutcome(
  {
    commandId:
      HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,

    meta: record.mutationMeta,

    aggregateType: "leave_request",
    aggregateId: approvedRequest.id,

    audit: {
      action: "leave_request.approved",
      changes: buildLeaveApprovalChanges({
        before: request,
        after: approvedRequest,
      }),
    },

    event: {
      type:
        HUMAN_RESOURCES_EVENT_LEAVE_REQUEST_APPROVED,

      payload: {
        leaveRequestId:
          approvedRequest.id,

        employeeId:
          approvedRequest.employeeId,

        leavePolicyId:
          approvedRequest.leavePolicyId,

        startsOn:
          approvedRequest.startsOn,

        endsOn:
          approvedRequest.endsOn,

        quantity:
          approvedRequest.quantity,

        approvedBy:
          record.approvedBy,

        approvedAt:
          approvedRequest.approvedAt,
      },
    },
  },
  transactionPorts,
);
```

For an audit-only command:

```ts
await emitHumanResourcesMutationOutcome(
  {
    commandId:
      HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_AMEND,

    meta: record.mutationMeta,

    aggregateType: "leave_policy",
    aggregateId: amendedPolicy.id,

    audit: {
      action: "leave_policy.amended",
      changes: buildLeavePolicyChanges({
        before: policy,
        after: amendedPolicy,
      }),
    },
  },
  transactionPorts,
);
```

The helper rejects an event if the registry declares the command as `audit_only`.

---

# 12. Slice 3.2 — Workforce-foundation emissions

## Domain files

```text
emissions/domains/workforce-foundation.ts
emissions/domains/core-organization.ts
```

## Recommended classification

### Person

| Mutation                         | Mode           |
| -------------------------------- | -------------- |
| Create person                    | `domain_event` |
| Correct identity                 | `domain_event` |
| Update non-material profile data | `audit_only`   |
| Change legal identity            | `domain_event` |

### Worker

| Mutation                  | Mode           |
| ------------------------- | -------------- |
| Create worker             | `domain_event` |
| Change worker type        | `domain_event` |
| Change worker status      | `domain_event` |
| Correct internal metadata | `audit_only`   |

### Employee

| Mutation                | Mode           |
| ----------------------- | -------------- |
| Create employee         | `domain_event` |
| Change employee status  | `domain_event` |
| Update ordinary profile | `audit_only`   |

### Employment

| Mutation          | Mode           |
| ----------------- | -------------- |
| Create employment | `domain_event` |
| Amend employment  | `domain_event` |
| End employment    | `domain_event` |
| Rehire            | `domain_event` |

### Contract

| Mutation           | Mode           |
| ------------------ | -------------- |
| Create contract    | `domain_event` |
| Amend or supersede | `domain_event` |
| End contract       | `domain_event` |

### Assignment

| Mutation                      | Mode           |
| ----------------------------- | -------------- |
| Create assignment             | `domain_event` |
| Transfer assignment           | `domain_event` |
| End assignment                | `domain_event` |
| Update insignificant metadata | `audit_only`   |

### Organization

| Mutation                      | Mode           |
| ----------------------------- | -------------- |
| Draft department/job/position | `audit_only`   |
| Activate/publish              | `domain_event` |
| Retire                        | `domain_event` |
| Reporting-line create/end     | `domain_event` |
| Position occupancy change     | `domain_event` |

The Cluster A audit found very low registry coverage across these commands, so use exhaustive command-group records rather than adding isolated entries.

---

# 13. Slice 3.3 — Recruitment emissions

## Recommended business events

```text
human-resources.requisition.approved.v1
human-resources.requisition.opened.v1
human-resources.requisition.closed.v1

human-resources.candidate.created.v1
human-resources.candidate.consent-withdrawn.v1
human-resources.candidate.retention-changed.v1

human-resources.application.submitted.v1
human-resources.application.stage-changed.v1
human-resources.application.rejected.v1
human-resources.application.withdrawn.v1

human-resources.interview.scheduled.v1
human-resources.interview.completed.v1

human-resources.offer.issued.v1
human-resources.offer.accepted.v1
human-resources.offer.rejected.v1
human-resources.offer.withdrawn.v1
human-resources.offer.expired.v1
```

## Recommended classification

| Mutation                                  | Mode           |
| ----------------------------------------- | -------------- |
| Draft requisition create/edit             | `audit_only`   |
| Requisition approve/open/close            | `domain_event` |
| Candidate create                          | `domain_event` |
| Candidate ordinary details update         | `audit_only`   |
| Consent withdrawal                        | `domain_event` |
| Retention change                          | `domain_event` |
| Application submission/stage/rejection    | `domain_event` |
| Interview scheduling/completion           | `domain_event` |
| Interview note correction                 | `audit_only`   |
| Offer draft/edit                          | `audit_only`   |
| Offer issue/accept/reject/withdraw/expire | `domain_event` |

## Sensitive payload rule

Do not include these in recruitment events unless a dedicated encrypted consumer contract exists:

* candidate date of birth;
* personal email;
* personal phone;
* home address;
* interview confidential notes;
* compensation negotiation notes;
* identity-document values.

Use stable IDs and safe facts.

---

# 14. Slice 3.4 — Lifecycle emissions

## Recommended events

```text
human-resources.onboarding.started.v1
human-resources.onboarding.completed.v1

human-resources.probation.reviewed.v1
human-resources.probation.extended.v1

human-resources.employee.confirmed.v1
human-resources.employee.transferred.v1
human-resources.employment.terminated.v1
human-resources.employee.rehired.v1

human-resources.offboarding.started.v1
human-resources.offboarding.completed.v1
human-resources.clearance.completed.v1
```

## Classification

| Mutation                   | Mode           |
| -------------------------- | -------------- |
| Draft lifecycle-case edits | `audit_only`   |
| Onboarding start/complete  | `domain_event` |
| Probation review/extension | `domain_event` |
| Confirmation               | `domain_event` |
| Transfer                   | `domain_event` |
| Termination                | `domain_event` |
| Rehire                     | `domain_event` |
| Offboarding start/complete | `domain_event` |
| Clearance item note update | `audit_only`   |
| Final clearance completion | `domain_event` |

Transfer and termination events must carry effective dates, not merely creation timestamps.

---

# 15. Slice 3.5 — Governance emissions

## Employee Relations

Recommended events:

```text
human-resources.employee-case.opened.v1
human-resources.employee-case.assigned.v1
human-resources.employee-case.action-recorded.v1
human-resources.employee-case.appealed.v1
human-resources.employee-case.closed.v1
human-resources.employee-case.reopened.v1
```

Do not place case allegations, evidence text or confidential notes in general platform events.

Use:

```ts
{
  employeeCaseId,
  subjectEmployeeId,
  caseCategoryCode,
  status,
  assignedInvestigatorId,
  effectiveAt
}
```

## Compliance

Recommended events:

```text
human-resources.employee-document.registered.v1
human-resources.employee-document.verified.v1
human-resources.employee-document.rejected.v1
human-resources.employee-document.expired.v1
human-resources.employee-document.nearing-expiry.v1

human-resources.work-eligibility.verified.v1
human-resources.work-eligibility.suspended.v1
human-resources.work-eligibility.renewed.v1
human-resources.work-eligibility.expired.v1

human-resources.policy-acknowledgement.outstanding.v1
human-resources.policy-acknowledgement.completed.v1
```

The audit specifically found compliance notification events outside the central event catalog.

## Talent

Recommended events:

```text
human-resources.competency-assessed.v1
human-resources.talent-profile.updated.v1
human-resources.talent-pool.member-added.v1
human-resources.talent-pool.member-removed.v1
human-resources.career-plan.approved.v1
human-resources.succession-plan.approved.v1
human-resources.succession-readiness.changed.v1
```

Do not emit sensitive ratings or confidential succession notes in general events.

## Workforce planning

Recommended events:

```text
human-resources.headcount-plan.approved.v1
human-resources.headcount-plan.reopened.v1
human-resources.headcount.reserved.v1
human-resources.headcount.reservation-released.v1
human-resources.headcount.reservation-consumed.v1
```

---

# 16. Slice 3.6 — Compensation, performance and learning

Do not finalize these event maps until their dedicated depth audit.

Create placeholder domain registry files, but do not mark coverage complete.

```ts
export const HUMAN_RESOURCES_COMPENSATION_EMISSIONS = {
  // Intentionally incomplete pending HR-AUD-06.
} satisfies Partial<
  Record<
    CompensationCommandId,
    HumanResourcesMutationEmissionDefinition
  >
>;
```

After audit, classify:

## Compensation

Likely events:

```text
compensation-agreement.approved
compensation-agreement.amended
compensation-review.completed
benefit-enrollment.activated
benefit-enrollment.ended
```

## Performance

Likely events:

```text
performance-cycle.published
performance-review.completed
performance-rating.finalized
improvement-plan.started
improvement-plan.completed
```

## Learning

Likely events:

```text
learning-session.scheduled
learning-assignment.created
learning-completion.recorded
certification.issued
certification.expired
```

These domains are currently recorded as unaudited-depth and should not be assigned production-complete event semantics prematurely.

---

# 17. Slice 3.7 — Event catalog alignment

## Recommended `@afenda/events` structure

```text
packages/platform/events/src/
├── event-envelope.ts
├── event-catalog.ts
├── event-types.ts
└── schemas/
    └── human-resources/
        ├── index.ts
        ├── leave.ts
        ├── workforce-foundation.ts
        ├── recruitment.ts
        ├── lifecycle.ts
        ├── compliance.ts
        ├── employee-relations.ts
        ├── talent.ts
        └── workforce-planning.ts
```

Adapt the path to the actual events package layout.

## Canonical envelope

```ts
import { z } from "zod";

export const domainEventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  eventVersion: z.number().int().positive(),

  organizationId: z.string().min(1),

  operationId: z.string().min(1),
  correlationId: z.string().min(1),
  causationId: z.string().min(1).optional(),

  actorUserId: z.string().min(1),

  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),

  occurredAt: z.string().datetime({
    offset: true,
  }),

  payload: z.record(z.string(), z.unknown()),
});
```

## Event catalog entry

```ts
import type {
  ZodType,
} from "zod";

export interface EventCatalogEntry {
  eventType: string;
  version: number;

  ownerPackage:
    | "@afenda/human-resources";

  schema: ZodType;

  consumers:
    readonly string[];

  projection:
    | {
        mode: "projected";
        projectionOwner: string;
      }
    | {
        mode: "notification";
        notificationOwner: string;
      }
    | {
        mode: "integration";
        integrationOwner: string;
      }
    | {
        mode: "documented_no_consumer";
        reason: string;
      };
}
```

## Example leave event schema

```ts
export const leaveRequestApprovedPayloadSchema =
  z.object({
    leaveRequestId:
      z.string().min(1),

    employeeId:
      z.string().min(1),

    leavePolicyId:
      z.string().min(1),

    startsOn:
      z.string().date(),

    endsOn:
      z.string().date(),

    quantity:
      z.string().regex(/^\d+(\.\d{1,4})?$/),

    approvedBy:
      z.string().min(1),

    approvedAt:
      z.string().datetime({
        offset: true,
      }),
  });
```

## Catalog registration

```ts
export const HUMAN_RESOURCES_EVENT_CATALOG = {
  "human-resources.leave-request.approved.v1": {
    eventType:
      "human-resources.leave-request.approved.v1",

    version: 1,

    ownerPackage:
      "@afenda/human-resources",

    schema:
      leaveRequestApprovedPayloadSchema,

    consumers: [
      "platform-workflow",
      "platform-notifications",
      "payroll-approved-leave-projection",
    ],

    projection: {
      mode: "projected",
      projectionOwner:
        "payroll-approved-leave-projection",
    },
  },
} as const satisfies Record<
  HumanResourcesEventType,
  EventCatalogEntry
>;
```

Every event must have a documented consumer or an explicit no-consumer reason.

---

# 18. Event construction

Use a single event builder.

```ts
export interface BuildHumanResourcesEventInput {
  eventType: HumanResourcesEventType;
  meta: HumanResourcesMutationMeta;

  aggregateType: string;
  aggregateId: string;

  payload: Readonly<Record<string, unknown>>;
}

export function buildHumanResourcesDomainEvent(
  input: BuildHumanResourcesEventInput,
): HumanResourcesDomainEvent {
  const catalogEntry =
    getEventCatalogEntry(input.eventType);

  const payload =
    catalogEntry.schema.parse(
      input.payload,
    );

  return {
    eventId: crypto.randomUUID(),
    eventType: input.eventType,
    eventVersion:
      catalogEntry.version,

    organizationId:
      input.meta.organizationId,

    operationId:
      input.meta.operationId,

    correlationId:
      input.meta.correlationId,

    causationId:
      input.meta.causationId,

    actorUserId:
      input.meta.actorUserId,

    aggregateType:
      input.aggregateType,

    aggregateId:
      input.aggregateId,

    occurredAt:
      input.meta.requestedAt,

    payload,
  };
}
```

Never construct event envelopes manually in individual adapters.

---

# 19. Slice 3.8 — Registry CI gate

## Test 1 — Complete command classification

```ts
import {
  HUMAN_RESOURCES_COMMAND_IDS,
} from "../src/module-ids";

import {
  HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
} from "../src/mutation-emission-registry";

describe("HR mutation emission registry", () => {
  it("classifies every mutating command", () => {
    const registered =
      new Set(
        Object.keys(
          HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
        ),
      );

    const missing =
      HUMAN_RESOURCES_COMMAND_IDS.filter(
        (commandId) =>
          !registered.has(commandId),
      );

    expect(missing).toEqual([]);
  });
});
```

Use the repository’s exact mutation-command inventory. Do not include query IDs.

## Test 2 — No unknown registry entries

```ts
it("contains no unknown command IDs", () => {
  const commandIds =
    new Set(HUMAN_RESOURCES_COMMAND_IDS);

  const unknown =
    Object.keys(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    ).filter(
      (commandId) =>
        !commandIds.has(
          commandId as HumanResourcesCommandId,
        ),
    );

  expect(unknown).toEqual([]);
});
```

## Test 3 — Event types exist in catalog

```ts
it("references only cataloged event types", () => {
  const missingEvents: string[] = [];

  for (
    const definition of Object.values(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    )
  ) {
    for (
      const eventType of definition.eventTypes
    ) {
      if (
        !HUMAN_RESOURCES_EVENT_TYPE_SET.has(
          eventType,
        )
      ) {
        missingEvents.push(
          `${definition.commandId} -> ${eventType}`,
        );
      }
    }
  }

  expect(missingEvents).toEqual([]);
});
```

## Test 4 — Domain events have nonempty event lists

```ts
it("requires events for domain-event commands", () => {
  for (
    const definition of Object.values(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    )
  ) {
    if (
      definition.emissionMode ===
      "domain_event"
    ) {
      expect(
        definition.eventTypes.length,
      ).toBeGreaterThan(0);
    }
  }
});
```

## Test 5 — Audit-only entries have no events

```ts
it("does not assign events to audit-only commands", () => {
  for (
    const definition of Object.values(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    )
  ) {
    if (
      definition.emissionMode ===
      "audit_only"
    ) {
      expect(
        definition.eventTypes,
      ).toEqual([]);
    }
  }
});
```

## Test 6 — Correlation required everywhere

```ts
it("requires correlation for every mutation", () => {
  for (
    const definition of Object.values(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    )
  ) {
    expect(
      definition.correlationRequired,
    ).toBe(true);
  }
});
```

## Test 7 — Audit required everywhere

```ts
it("requires audit for every mutation", () => {
  for (
    const definition of Object.values(
      HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
    )
  ) {
    expect(
      definition.auditRequired,
    ).toBe(true);
  }
});
```

## Test 8 — Audit and event correlation parity

```ts
it("uses the same correlation context for audit and event", async () => {
  const audit = createTestAuditPort();
  const outbox = createTestOutboxPort();

  await executeRegisteredMutation({
    audit,
    outbox,
    correlationId: "correlation-123",
    operationId: "operation-456",
  });

  expect(
    audit.records[0]?.correlationId,
  ).toBe("correlation-123");

  expect(
    outbox.events[0]?.correlationId,
  ).toBe("correlation-123");

  expect(
    audit.records[0]?.operationId,
  ).toBe("operation-456");

  expect(
    outbox.events[0]?.operationId,
  ).toBe("operation-456");
});
```

## Test 9 — No direct outbox writes

Add an import-boundary test or repository rule.

Allowed files:

```text
src/emissions/mutation-outcome.ts
src/production-ports.ts
src/adapters/**/transaction-port-adapters.ts
```

Prohibit domain adapters from calling low-level outbox publishing directly.

Conceptual test:

```ts
it("does not allow direct domain outbox publishing", async () => {
  const violations =
    await findForbiddenImports({
      root:
        "packages/erp/human-resources/src",

      forbiddenSymbols: [
        "publishOutboxEvent",
        "insertOutboxEvent",
      ],

      allowedFiles: [
        "emissions/mutation-outcome.ts",
        "production-ports.ts",
      ],
    });

  expect(violations).toEqual([]);
});
```

Use the repository’s existing AST/import-governance utility rather than regex where available.

## Test 10 — Every event catalog entry has ownership

```ts
it("gives every HR event an owner and consumer disposition", () => {
  for (
    const entry of Object.values(
      HUMAN_RESOURCES_EVENT_CATALOG,
    )
  ) {
    expect(
      entry.ownerPackage,
    ).toBe(
      "@afenda/human-resources",
    );

    expect(
      entry.projection,
    ).toBeDefined();

    if (
      entry.projection.mode !==
      "documented_no_consumer"
    ) {
      expect(
        entry.consumers.length,
      ).toBeGreaterThan(0);
    }
  }
});
```

---

# 20. Registry validator

## Runtime/documentation validator

```ts
export interface HumanResourcesEmissionRegistryIssue {
  commandId?: string;
  eventType?: string;

  code:
    | "missing_command"
    | "unknown_command"
    | "missing_event"
    | "unknown_event"
    | "audit_only_with_event"
    | "domain_event_without_event"
    | "missing_correlation"
    | "missing_audit"
    | "domain_mismatch";

  message: string;
}

export function validateHumanResourcesMutationEmissionRegistry():
  HumanResourcesEmissionRegistryIssue[] {
  const issues:
    HumanResourcesEmissionRegistryIssue[] = [];

  const registered =
    HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY;

  for (
    const commandId of
    HUMAN_RESOURCES_COMMAND_IDS
  ) {
    if (!registered[commandId]) {
      issues.push({
        commandId,
        code: "missing_command",
        message:
          `No emission classification for ${commandId}.`,
      });
    }
  }

  for (
    const definition of Object.values(
      registered,
    )
  ) {
    if (
      !definition.auditRequired
    ) {
      issues.push({
        commandId:
          definition.commandId,

        code:
          "missing_audit",

        message:
          `${definition.commandId} must require audit.`,
      });
    }

    if (
      !definition.correlationRequired
    ) {
      issues.push({
        commandId:
          definition.commandId,

        code:
          "missing_correlation",

        message:
          `${definition.commandId} must require correlation.`,
      });
    }

    if (
      definition.emissionMode ===
        "domain_event" &&
      definition.eventTypes.length === 0
    ) {
      issues.push({
        commandId:
          definition.commandId,

        code:
          "domain_event_without_event",

        message:
          `${definition.commandId} requires an event type.`,
      });
    }

    for (
      const eventType of
      definition.eventTypes
    ) {
      if (
        !HUMAN_RESOURCES_EVENT_TYPE_SET.has(
          eventType,
        )
      ) {
        issues.push({
          commandId:
            definition.commandId,

          eventType,

          code:
            "unknown_event",

          message:
            `${eventType} is not registered in @afenda/events.`,
        });
      }
    }
  }

  return issues;
}
```

---

# 21. Event payload rules

## Required in every event envelope

* `eventId`
* `eventType`
* `eventVersion`
* `organizationId`
* `operationId`
* `correlationId`
* `actorUserId`
* `aggregateType`
* `aggregateId`
* `occurredAt`

## Include in payload only when relevant

* effective date;
* subject employee ID;
* related employment ID;
* related assignment ID;
* status;
* reason code;
* source version;
* safe projection facts.

## Never include by default

* government ID values;
* passport values;
* banking details;
* salary amounts in general events;
* medical information;
* confidential case evidence;
* interview private notes;
* performance narrative;
* succession narrative;
* raw document content;
* personal contact details.

Events should carry identifiers and business facts—not full records.

---

# 22. Audit fact rules

Every mutation produces an audit fact regardless of event mode.

Recommended audit structure:

```ts
export interface HumanResourcesAuditFact {
  organizationId: string;

  commandId:
    HumanResourcesCommandId;

  operationId: string;
  correlationId: string;
  causationId?: string;

  actorUserId: string;

  aggregateType: string;
  aggregateId: string;

  action: string;

  changes:
    readonly {
      field: string;
      before?: unknown;
      after?: unknown;
      classification?:
        | "ordinary"
        | "sensitive"
        | "redacted";
    }[];

  occurredAt: string;
}
```

Sensitive audit values should be fingerprinted, masked or omitted according to the existing audit contract.

---

# 23. Idempotency and duplicate-event protection

Correlation does not replace idempotency.

Use:

```text
operationId
→ one logical command execution

idempotencyKey
→ replay identity

correlationId
→ full business request or workflow chain

causationId
→ direct parent operation or event
```

Recommended outbox uniqueness:

```text
organizationId
+ commandId
+ operationId
+ eventType
```

A retried command with the same operation ID must not create duplicate domain events.

A second legitimate operation may share the same correlation ID but must have a different operation ID.

---

# 24. Recommended PR sequence

## PR 3.0 — Registry infrastructure

Add:

* emission types;
* definition helpers;
* registry resolver;
* outcome validator;
* mutation outcome executor;
* registry tests.

Do not add all domains yet.

## PR 3.1 — Leave registry

Complete:

* all 18 leave mutations;
* leave event schemas;
* leave adapter integration;
* Memory/Drizzle parity;
* correlation tests.

## PR 3.2 — Foundation, core and organization

Complete:

* person;
* worker;
* employee;
* employment;
* contract;
* assignment;
* organization.

## PR 3.3 — Recruitment

Complete:

* requisition;
* candidate;
* application;
* interview;
* offer;
* consent;
* retention.

## PR 3.4 — Lifecycle

Complete:

* onboarding;
* probation;
* confirmation;
* transfer;
* termination;
* offboarding;
* clearance;
* rehire.

## PR 3.5 — Governance

Complete:

* Employee Relations;
* compliance;
* talent;
* succession;
* workforce planning.

## PR 3.6 — Event catalog alignment

Complete:

* missing `@afenda/events` schemas;
* owner metadata;
* consumers;
* compliance events;
* schema versioning.

## PR 3.7 — Remaining audited domains

After the dedicated depth audit:

* compensation;
* performance;
* learning.

## PR 3.8 — Strict CI gate

Change:

```ts
Partial<Record<...>>
```

to:

```ts
Record<...>
```

Enable all strict tests.

---

# 25. Required tests by slice

## Leave

```text
leave-emission-registry-parity.test.ts
leave-correlation-integrity.test.ts
human-resources.leave.test.ts
human-resources.leave.parity.test.ts
```

## Foundation/core

```text
workforce-foundation-emission-registry.test.ts
core-emission-registry.test.ts
human-resources.foundation.parity.test.ts
human-resources.core.parity.test.ts
```

## Recruitment

```text
recruitment-emission-registry.test.ts
recruitment-correlation-integrity.test.ts
human-resources.recruitment.parity.test.ts
```

## Lifecycle

```text
lifecycle-emission-registry.test.ts
lifecycle-correlation-integrity.test.ts
human-resources.lifecycle.parity.test.ts
```

## Governance

```text
governance-emission-registry.test.ts
employee-relations-emission.test.ts
compliance-event-catalog.test.ts
human-resources.talent.parity.test.ts
human-resources.workforce-planning.parity.test.ts
```

## Cross-cut

```text
emission-registry-parity.test.ts
event-catalog-parity.test.ts
correlation-integrity.test.ts
no-direct-outbox-emission.test.ts
```

---

# 26. Verification commands

## Infrastructure

```bash
pnpm --filter @afenda/human-resources test -- \
  emission-registry-parity \
  correlation-integrity
```

## Leave tranche

```bash
pnpm --filter @afenda/human-resources test -- \
  leave-emission-registry \
  human-resources.leave \
  correlation-integrity

REQUIRE_DATABASE_TESTS=1 \
pnpm --filter @afenda/human-resources test -- \
  human-resources.leave.parity
```

## Foundation and lifecycle

```bash
pnpm --filter @afenda/human-resources test -- \
  workforce-foundation-emission \
  core-emission \
  lifecycle-emission \
  human-resources.foundation \
  human-resources.core \
  human-resources.lifecycle
```

## Recruitment

```bash
pnpm --filter @afenda/human-resources test -- \
  recruitment-emission \
  human-resources.recruitment

REQUIRE_DATABASE_TESTS=1 \
pnpm --filter @afenda/human-resources test -- \
  human-resources.recruitment.parity
```

## Governance

```bash
pnpm --filter @afenda/human-resources test -- \
  governance-emission \
  employee-relations \
  compliance \
  talent \
  workforce-planning
```

## Event package

```bash
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test
```

## Final package gate

```bash
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test

REQUIRE_DATABASE_TESTS=1 \
pnpm --filter @afenda/human-resources test

pnpm validate:modules
```

---

# 27. Completion checklist

## Registry

* [ ] All mutating command IDs classified.
* [ ] No duplicate registry entry.
* [ ] No unknown registry command.
* [ ] Audit-only commands have empty event lists.
* [ ] Domain-event commands have nonempty event lists.
* [ ] Every entry requires audit.
* [ ] Every entry requires correlation.

## Runtime

* [ ] All audit writes use canonical mutation metadata.
* [ ] All outbox writes use canonical mutation metadata.
* [ ] Audit and event correlation IDs match.
* [ ] Audit and event operation IDs match.
* [ ] Adapter emission passes registry validation.
* [ ] Undeclared events fail before publication.
* [ ] Audit-only commands cannot publish events.
* [ ] Domain-event commands cannot complete without their required event.

## Event catalog

* [ ] Every event exists in `@afenda/events`.
* [ ] Every event has a versioned schema.
* [ ] Every event has an owner.
* [ ] Every event has a consumer or documented no-consumer reason.
* [ ] Every event carries organization context.
* [ ] Every event carries correlation context.
* [ ] Sensitive payload fields are excluded.

## Parity

* [ ] Memory and Drizzle emit equivalent event types.
* [ ] Memory and Drizzle emit equivalent safe payload facts.
* [ ] Memory and Drizzle preserve correlation.
* [ ] Idempotent replay does not duplicate events.
* [ ] Failed mutations produce neither success events nor misleading audit outcomes.

## Governance

* [ ] Direct adapter outbox writes prohibited.
* [ ] Registry parity enforced in CI.
* [ ] Event catalog parity enforced in CI.
* [ ] Full package gate green.
* [ ] `HR-XCUT-P0-003` closed.

---

# Final implementation order

Execute exactly:

```text
3.0 Registry infrastructure
3.1 Leave — all 18 commands
3.2 Workforce foundation, core and organization
3.3 Recruitment
3.4 Lifecycle
3.5 Governance domains
3.7 Event catalog completion
3.6 Compensation, performance and learning after audit
3.8 Strict registry and CI gate
```

The first coding mission is:

```text
HR-OPS-LEAVE-EMISSION-REGISTRY
```

Its closure condition is:

```text
18 / 18 leave mutations explicitly classified
+ all declared event types present in @afenda/events
+ Memory/Drizzle correlation parity green
+ no direct undocumented leave outbox emission
```
