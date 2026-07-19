import { IdentityEventSchemas } from "./identity.events";
import { PlatformEventSchemas } from "./platform.events";

export {
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
} from "./identity.events";
export {
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	platformOrganizationDeletedPayloadSchema,
} from "./platform.events";

export const AllEventSchemas = {
	...IdentityEventSchemas,
	...PlatformEventSchemas,
} as const;

export type AllEventType = keyof typeof AllEventSchemas;

export function isKnownEventType(type: string): type is AllEventType {
	return Object.hasOwn(AllEventSchemas, type);
}
