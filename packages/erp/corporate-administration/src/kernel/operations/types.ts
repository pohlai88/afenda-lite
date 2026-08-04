import type { CorporateAdministrationPermission } from "../authorization/permissions";
import type { CorporateAdministrationRegisteredEventType } from "../emissions/event-types";

export const CORPORATE_ADMINISTRATION_OPERATION_OWNERS = [
	"company",
	"establishments",
	"governance",
	"officers",
	"meetings",
	"resolutions",
	"authority",
] as const;

export type CorporateAdministrationOperationOwner =
	(typeof CORPORATE_ADMINISTRATION_OPERATION_OWNERS)[number];

type SharedOperationDefinition = Readonly<{
	id: string;
	owner: CorporateAdministrationOperationOwner;
	permission: CorporateAdministrationPermission;
	authorizationPolicy: "tenant_permission" | "tenant_permission_and_approval";
	approvalPolicy:
		| "none"
		| "maker_checker_when_configured"
		| "maker_checker_required"
		| "maker_checker_for_protected_role";
	privacyPolicy: "redacted_domain_event" | "tenant_scoped_read";
	observabilityClass: "corporate_administration_operation";
	publicProjection: "root_function";
}>;

export type CorporateAdministrationCommandDefinition =
	SharedOperationDefinition &
		Readonly<{
			kind: "command";
			commandIdentity: string;
			transaction: "required";
			idempotency: "required";
			emission: "required";
			eventType: CorporateAdministrationRegisteredEventType;
		}>;

export type CorporateAdministrationQueryDefinition = SharedOperationDefinition &
	Readonly<{
		kind: "query";
		transaction: "none";
		idempotency: "none";
		emission: "none";
	}>;

export type CorporateAdministrationOperationDefinition =
	| CorporateAdministrationCommandDefinition
	| CorporateAdministrationQueryDefinition;

type CommandDefinitionInput<
	TId extends string,
	TCommandIdentity extends string,
> = Readonly<{
	id: TId;
	owner: CorporateAdministrationOperationOwner;
	permission: CorporateAdministrationPermission;
	commandIdentity: TCommandIdentity;
	eventType: CorporateAdministrationRegisteredEventType;
}>;

export function defineCorporateAdministrationCommand<
	const TId extends string,
	const TCommandIdentity extends string,
>(input: CommandDefinitionInput<TId, TCommandIdentity>) {
	return createCommandDefinition(input, "none");
}

export function defineCorporateAdministrationOptionalApprovalCommand<
	const TId extends string,
	const TCommandIdentity extends string,
>(input: CommandDefinitionInput<TId, TCommandIdentity>) {
	return createCommandDefinition(input, "maker_checker_when_configured");
}

export function defineCorporateAdministrationRequiredApprovalCommand<
	const TId extends string,
	const TCommandIdentity extends string,
>(input: CommandDefinitionInput<TId, TCommandIdentity>) {
	return createCommandDefinition(input, "maker_checker_required");
}

export function defineCorporateAdministrationProtectedRoleApprovalCommand<
	const TId extends string,
	const TCommandIdentity extends string,
>(input: CommandDefinitionInput<TId, TCommandIdentity>) {
	return createCommandDefinition(input, "maker_checker_for_protected_role");
}

function createCommandDefinition<
	const TId extends string,
	const TCommandIdentity extends string,
>(
	input: CommandDefinitionInput<TId, TCommandIdentity>,
	approvalPolicy: CorporateAdministrationCommandDefinition["approvalPolicy"],
) {
	return {
		id: input.id,
		kind: "command",
		owner: input.owner,
		permission: input.permission,
		authorizationPolicy:
			approvalPolicy === "none"
				? "tenant_permission"
				: "tenant_permission_and_approval",
		approvalPolicy,
		transaction: "required",
		idempotency: "required",
		emission: "required",
		eventType: input.eventType,
		privacyPolicy: "redacted_domain_event",
		observabilityClass: "corporate_administration_operation",
		publicProjection: "root_function",
		commandIdentity: input.commandIdentity,
	} as const satisfies CorporateAdministrationCommandDefinition;
}

export function defineCorporateAdministrationQuery<
	const TId extends string,
>(input: {
	id: TId;
	owner: CorporateAdministrationOperationOwner;
	permission: CorporateAdministrationPermission;
}) {
	return {
		id: input.id,
		kind: "query",
		owner: input.owner,
		permission: input.permission,
		authorizationPolicy: "tenant_permission",
		approvalPolicy: "none",
		transaction: "none",
		idempotency: "none",
		emission: "none",
		privacyPolicy: "tenant_scoped_read",
		observabilityClass: "corporate_administration_operation",
		publicProjection: "root_function",
	} as const satisfies CorporateAdministrationQueryDefinition;
}
