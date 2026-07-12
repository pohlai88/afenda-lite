# Ports and adapters

Contract-first ports (api-and-interface-design). Implementations are `modules/*/domain` exports. Driving adapters: RSC runners, Server Actions, Route Handlers.

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
| list / get | `modules/declarations/domain/surveys.ts`, display helpers | RSC `features/organization-admin/*` / dashboard runners |
| create / update / delete | `surveys.ts` | `createDraftSurveyAction`, `updateSurveyAction`, `deleteSurveyAction` |
| submit assignment | `survey-submission.ts`, client submit | `submitClientDeclarationAction`, `submitSurveyResponseAction` |
| save draft | `client-declaration-draft.ts` | `saveClientDeclarationDraftAction`, `PUT/PATCH /api/client/declaration-draft` |
| share / invite token | `declaration-share-links.ts`, `modules/identity/domain/tokens.ts` | `regenerateInviteTokenAction`, share panels |
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
| list | `modules/declarations/domain/clients.ts` | RSC clients page |
| invite | invite / clients | `issueClientInviteAction` |
| remove / delete assignment | `clients.ts` | `removeClientRegistrationAction`, `deleteClientAssignmentAction` |

## IdentityPort

```typescript
interface IdentityPort {
  // session resolution lives in modules/identity/auth — adapters call require*Session
  listOrganizationUsers(): Promise<OrganizationUser[]>
  getOrganizationUser(id: UserId): Promise<OrganizationUser | null>
  createOrganizationUser(input: CreateOrganizationUserInput): Promise<{ userId: UserId }>
  importOrganizationUsers(users: CreateOrganizationUserInput[]): Promise<{
    created: number
    failed: number
    failures: Array<{ email: string; error: string }>
  }>
  updateOrganizationUser(input: UpdateOrganizationUserInput): Promise<void>
  removeOrganizationUser(userId: UserId): Promise<void>
  removeOrganizationUsers(userIds: UserId[]): Promise<{ removed: number }>
  setOrganizationUserRole(input: { userId: UserId; role: 'user' | 'admin' }): Promise<void>
  setOrganizationUserPassword(input: { userId: UserId; newPassword: string }): Promise<void>
  banOrganizationUser(input: { userId: UserId; banReason?: string }): Promise<void>
  banOrganizationUsers(input: { userIds: UserId[]; banReason?: string }): Promise<{ banned: number }>
  unbanOrganizationUser(userId: UserId): Promise<void>
  listOrganizationUserSessions(userId: UserId): Promise<OrganizationUserSession[]>
  revokeOrganizationUserSessions(userId: UserId): Promise<void>
  getClientProfile(userId: string): Promise<ClientProfile | null>
  ensureClientProfileRow(userId: string): Promise<void>
  bootstrapClientAfterAuth(input: BootstrapClientAuthInput): Promise<void>
  saveOnboarding(input: OnboardingInput): Promise<void>
  acknowledgePortal(actorId: string): Promise<void>
  // Neon-owned self-service password/email stay on Neon Auth UI + /api/auth/*
}
```

| Port op | Domain / module | Adapters |
|---------|-----------------|----------|
| list / get users | `modules/identity/domain/organization-users.ts` | RSC `features/organization-admin/organization-admin-users-page` (+ profile summaries composed from Declarations) |
| create / update / remove | `modules/identity/auth/admin.ts` (`neonAdmin*`) | `createOrganizationUserAction`, `importOrganizationUsersAction`, `updateOrganizationUserAction`, `removeOrganizationUserAction`, `removeOrganizationUsersAction` |
| set role / ban / unban | `modules/identity/auth/admin.ts` | `setOrganizationUserRoleAction`, `banOrganizationUserAction`, `banOrganizationUsersAction`, `unbanOrganizationUserAction` |
| password / sessions | `modules/identity/auth/admin.ts` | `setOrganizationUserPasswordAction`, view loader + `revokeOrganizationUserSessionsAction` |
| client profile read / ensure | `modules/identity/domain/client-profile.ts` | session gates, portal-member, landing/public-link routing; Declarations re-exports |
| auth invite bootstrap | `modules/identity/domain/client-invitation-bootstrap.ts` + `auth/bootstrap-client-invite.ts` | `bootstrapClientAfterAuth` from session / landing |
| onboarding | `modules/declarations/client-onboarding*` | `saveClientOnboardingAction` |
| ACK | `modules/identity/client-session` | `acknowledgeClientPortalAction` |
| preview | `modules/identity/preview-client` | `startClientPreviewAction`, `exitClientPreviewAction` |
| auth HTTP | Neon via `modules/identity/auth` | `/api/auth/[...path]` |

## PlatformPort

| Port op | Adapter |
|---------|---------|
| liveness | `GET /api/health/liveness` |
| readiness | `GET /api/health/readiness` |

## TradePort (appendix)

Documented at resource level in [../api/02-rest-resources.md](../api/02-rest-resources.md) Feed Farm Trade section. Implementation: `modules/fft/domain/**` + `app/actions/fft.ts`. Web UI uses Actions; HTTP is contract-only until an external consumer needs it.

## Adapter rule (DRY)

```text
One port function
  ├── Server Action (UI command)  ─┐
  └── Route Handler (HTTP)        ─┴─ same Zod input, same domain call, same error codes
```

Do not implement divergent business logic in Action vs Route Handler.

## Related

- [07-conventions.md](07-conventions.md)  
- [05-nextjs-adapter-map.md](05-nextjs-adapter-map.md)  
- [../api/05-schema-map.md](../api/05-schema-map.md)  
