# Ports and adapters

Contract-first ports (api-and-interface-design). Implementations are existing `lib/domain` exports. Driving adapters: RSC runners, Server Actions, Route Handlers.

Ports **never** import `Request`, `next/headers`, or UI.

## DeclarationsPort

```typescript
interface DeclarationsPort {
  listDeclarations(params: ListDeclarationsParams): Promise<PaginatedResult<Declaration>>
  getDeclaration(id: DeclarationId): Promise<Declaration>
  createDeclaration(input: CreateDeclarationInput): Promise<Declaration>
  updateDeclaration(id: DeclarationId, input: UpdateDeclarationInput): Promise<Declaration>
  deleteDeclaration(id: DeclarationId): Promise<void> // idempotent
  submitAssignment(input: SubmitAssignmentInput): Promise<Submission>
  saveDraft(input: SaveDraftInput): Promise<void>
  // share / package ops as needed
}
```

| Port op | Domain (approx) | Driving adapters |
|---------|-----------------|------------------|
| list / get | `lib/domain/surveys.ts`, display helpers | RSC `lib/pages` / dashboard runners |
| create / update / delete | `surveys.ts` | `createDraftSurveyAction`, `updateSurveyAction`, `deleteSurveyAction` |
| submit assignment | `survey-submission.ts`, client submit | `submitClientDeclarationAction`, `submitSurveyResponseAction` |
| save draft | `client-declaration-draft.ts` | `saveClientDeclarationDraftAction`, `PUT/PATCH /api/client/declaration-draft` |
| share / invite token | `declaration-share-links.ts`, `tokens.ts` | `regenerateInviteTokenAction`, share panels |
| evidence | evidence-policy / `registerEvidenceAction` | `registerEvidenceAction` |

REST shapes: [../api/02-rest-resources.md](../api/02-rest-resources.md) (Declarations, Assignments, Share links).

## ClientsPort (Declarations context)

```typescript
interface ClientsPort {
  listClients(params: ListClientsParams): Promise<PaginatedResult<ClientSummary>>
  issueInvitation(input: IssueInviteInput): Promise<void>
  removeRegistration(clientId: ClientId): Promise<void>
  deleteAssignment(assignmentId: AssignmentId): Promise<void>
}
```

| Port op | Domain | Adapters |
|---------|--------|----------|
| list | `lib/domain/clients.ts` | RSC clients page |
| invite | `invite.ts` / clients | `issueClientInviteAction` |
| remove / delete assignment | `clients.ts` | `removeClientRegistrationAction`, `deleteClientAssignmentAction` |

## IdentityPort

```typescript
interface IdentityPort {
  // session resolution lives in lib/auth — adapters call require*Session
  saveOnboarding(input: OnboardingInput): Promise<void>
  acknowledgePortal(actorId: string): Promise<void>
  // Neon-owned password/email stay on Neon Auth UI + /api/auth/*
}
```

| Port op | Domain / lib | Adapters |
|---------|--------------|----------|
| onboarding | client onboarding domain/server | `saveClientOnboardingAction` |
| ACK | client session helpers | `acknowledgeClientPortalAction` |
| preview | preview-client | `startClientPreviewAction`, `exitClientPreviewAction` |
| auth HTTP | Neon | `/api/auth/[...path]` |

## PlatformPort

| Port op | Adapter |
|---------|---------|
| liveness | `GET /api/health/liveness` |
| readiness | `GET /api/health/readiness` |

## TradePort (appendix)

Documented at resource level in [../api/02-rest-resources.md](../api/02-rest-resources.md) Hot Sales section. Implementation: `lib/domain/trade/**` + `app/actions/trade.ts`. Web UI uses Actions; HTTP is contract-only until an external consumer needs it.

## Adapter rule (DRY)

```text
One port function
  ├── Server Action (UI command)  ─┐
  └── Route Handler (HTTP)        ─┴─ same Zod input, same domain call, same error codes
```

Do not implement divergent business logic in Action vs Route Handler.

## Related

- [05-contract-rules.md](05-contract-rules.md)  
- [04-nextjs-adapter-map.md](04-nextjs-adapter-map.md)  
- [../api/05-schema-map.md](../api/05-schema-map.md)  
