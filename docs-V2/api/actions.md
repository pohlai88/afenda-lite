# Server Actions (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/actions.md` |
| Authority | **Scratch** — api-and-interface-design + disk `apps/web/app/actions/**` |
| Updated | 2026-07-20 |

UI mutation adapters only. Contract: `ActionResult<T>` (`ok: true | false`) — see [README.md](README.md). RH paths stay in [rest.md](rest.md). Re-probe disk after Action add/remove — do not invent rows. Companion map: [adapter-map.md](../../.cursor/skills/afenda-elite-backend-modules/adapter-map.md).

---

## api-now (disk)

| File | Export(s) | Owning context | Role |
|------|-----------|----------------|------|
| `auth-credentials.ts` | `signInAction` · `signOutAction` | identity (+ `@afenda/auth`) | Email sign-in → `ActionResult`; sign-out redirects (`void`) |
| `permission-gate.ts` | `forbidUnlessPermission` | identity | Shared Action denial helper → `ActionFailure \| null` |
| `run-member-session-action.ts` | `runMemberSessionAction` | identity | Shared member-session runner |
| `run-operator-permission-action.ts` | `runOperatorPermissionAction` | identity | Shared operator + permission runner |
| `map-package-result.ts` | `mapPackageResult` | platform | Package `Result` → `ActionResult` |
| `invite-org-member.ts` | `inviteOrgMemberAction` | identity | Org invite mutation |
| `assign-org-role.ts` | `assignOrgRoleAction` | identity | Assign org role (+ audit path) |
| `revoke-org-role.ts` | `revokeOrgRoleAction` | identity | Revoke org role (+ audit path) |
| `search-org-members.ts` | `searchOrgMembersAction` | identity | Org member search / picker |
| `provision-organization.ts` | `provisionOrganizationAction` | platform | Org provision |
| `delete-organization.ts` | `deleteOrganizationAction` | platform | Org delete |
| `get-organization-usage.ts` | `getOrganizationUsageAction` | platform | Org usage position (`@afenda/admin/usage` matrix) |
| `list-parties.ts` | `listPartiesAction` | master-data | List parties (`master_data.read`) |
| `create-party.ts` | `createPartyAction` | master-data | Create party (`master_data.manage`) |
| `activate-party.ts` | `activatePartyAction` | master-data | Activate party (`master_data.manage`; MDG-gated) |
| `list-party-roles.ts` | `listPartyRolesAction` | master-data | List party roles (`master_data.read`) |
| `create-party-role.ts` | `createPartyRoleAction` | master-data | Create party role (`master_data.manage`) |
| `merge-parties.ts` | `mergePartiesAction` | master-data | Governed party merge (`master_data.manage`; MDG-gated) |
| `list-items.ts` | `listItemsAction` | master-data | List items (`master_data.read`) |
| `list-item-groups.ts` | `listItemGroupsAction` | master-data | List item groups (`master_data.read`) |
| `list-warehouses.ts` | `listWarehousesAction` | master-data | List warehouses (`master_data.read`) |
| `list-payment-terms.ts` | `listPaymentTermsAction` | master-data | List payment terms (`master_data.read`) |
| `create-payment-term.ts` | `createPaymentTermAction` | master-data | Create payment term (`master_data.manage`) |
| `update-payment-term.ts` | `updatePaymentTermAction` | master-data | Update payment term CAS (`master_data.manage`) |
| `activate-payment-term.ts` | `activatePaymentTermAction` | master-data | Activate payment term (`master_data.manage`) |
| `inactive-payment-term.ts` | `inactivePaymentTermAction` | master-data | Inactivate payment term (`master_data.manage`) |
| `retire-payment-term.ts` | `retirePaymentTermAction` | master-data | Retire payment term (`master_data.manage`) |
| `payment-term-lifecycle.ts` | `runPaymentTermLifecycle` | master-data | Shared payment-term lifecycle helper |
| `list-tax-registrations.ts` | `listTaxRegistrationsAction` | master-data | List tax registrations (`master_data.read`) |
| `create-tax-registration.ts` | `createTaxRegistrationAction` | master-data | Create tax registration (`master_data.manage`) |
| `update-tax-registration.ts` | `updateTaxRegistrationAction` | master-data | Update tax registration CAS (`master_data.manage`) |
| `activate-tax-registration.ts` | `activateTaxRegistrationAction` | master-data | Activate tax registration (`master_data.manage`) |
| `block-tax-registration.ts` | `blockTaxRegistrationAction` | master-data | Block tax registration (`master_data.manage`) |
| `restore-tax-registration.ts` | `restoreTaxRegistrationAction` | master-data | Restore tax registration (`master_data.manage`) |
| `retire-tax-registration.ts` | `retireTaxRegistrationAction` | master-data | Retire tax registration (`master_data.manage`) |
| `tax-registration-lifecycle.ts` | `runTaxRegistrationLifecycle` | master-data | Shared tax-registration lifecycle helper |
| `list-item-templates.ts` | `listItemTemplatesAction` | master-data | List item templates (`master_data.read`) |
| `create-item-template.ts` | `createItemTemplateAction` | master-data | Create item template (`master_data.manage`) |
| `activate-item-template.ts` | `activateItemTemplateAction` · `activateItemTemplateFormAction` | master-data | Activate draft template (`master_data.manage`) |
| `add-item-template-attribute.ts` | `addItemTemplateAttributeAction` | master-data | Add template attribute (`master_data.manage`) |
| `add-item-template-attribute-option.ts` | `addItemTemplateAttributeOptionAction` | master-data | Add closed attribute option (`master_data.manage`) |
| `create-item-variant.ts` | `createItemVariantAction` | master-data | Create concrete variant item (`master_data.manage`) |
| `submit-change-request.ts` | `submitChangeRequestAction` | master-data | Submit MDG CR (`master_data.manage`) |
| `approve-change-request.ts` | `approveChangeRequestAction` | master-data | Approve MDG CR (`master_data.approve`) |
| `reject-change-request.ts` | `rejectChangeRequestAction` | master-data | Reject MDG CR (`master_data.approve`) |
| `search-master-data.ts` | `searchMasterDataAction` | master-data | Read-only FTS over `md_*` projections (`master_data.read`) |
| `rebuild-master-data-search.ts` | `rebuildMasterDataSearchAction` | master-data | Rebuild search from SSOT (`master_data.manage`) |
| `validate-master-data-import.ts` | `validateMasterDataImportAction` | master-data | Dry-run party import reconcile (`master_data.manage`) |
| `apply-master-data-import.ts` | `applyMasterDataImportAction` | master-data | Apply bounded party upsert-by-code (`master_data.import_approve`) |
| `list-sales-orders.ts` | `listSalesOrdersAction` | sales | List sales orders (`sales.order.list`) |
| `get-sales-order.ts` | `getSalesOrderAction` | sales | Get sales order (`sales.order.read`) |
| `create-sales-order.ts` | `createSalesOrderAction` | sales | Create draft order (`sales.order.create`) |
| `add-sales-order-line.ts` | `addSalesOrderLineAction` | sales | Add order line (`sales.order.update`) |
| `post-sales-order.ts` | `postSalesOrderAction` | sales | Post order / freeze snapshots (`sales.order.post`) |
| `cancel-sales-order.ts` | `cancelSalesOrderAction` | sales | Cancel draft or posted order (`sales.order.cancel`) |
| `list-my-notifications.ts` | `listMyNotificationsAction` | notifications | List IN_APP inbox |
| `get-unread-notification-count.ts` | `getUnreadNotificationCountAction` | notifications | Unread count |
| `mark-notification-read.ts` | `markNotificationReadAction` | notifications | Mark one read |
| `mark-all-notifications-read.ts` | `markAllNotificationsReadAction` | notifications | Mark all read |

Paths are under `apps/web/app/actions/`. Authz + Zod inside each mutation Action — proxy alone is not authz.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No tutorial `{ success, data }` envelopes | Breaks `ActionResult` consumers ([README.md](README.md)) |
| No SQL in Actions | Thin adapters → packages / `modules/*/domain` |
| No invented Action files | Catalogue = disk only |
| Not OpenAPI | Actions are same-origin UI mutations; YAML is RH api-now only |
