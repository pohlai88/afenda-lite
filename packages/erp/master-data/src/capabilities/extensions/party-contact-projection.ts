import type { PartyContactId, PartyId } from "../../brands";
import { partyContactIdSchema, partyIdSchema } from "../../brands";
import {
	type OrganizationId,
	organizationIdSchema,
} from "../../contracts/context";
import type {
	PartyContact,
	PartyContactType,
	PartyContactVerificationStatus,
	StandardChildLifecycleStatus,
} from "../../types";

export interface PartyContactProjection {
	contactKind: PartyContactType;
	id: PartyContactId;
	isPrimary: boolean;
	label: string | null;
	maskedValue: string;
	organizationId: OrganizationId;
	partyId: PartyId;
	status: StandardChildLifecycleStatus;
	verificationStatus: PartyContactVerificationStatus;
	version: number;
}

export interface SensitivePartyContactProjection
	extends PartyContactProjection {
	value: string;
}

export function maskPartyContactValue(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length <= 4) {
		return "*".repeat(trimmed.length);
	}
	return `${"*".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

export function toPartyContactProjection(
	contact: PartyContact,
): PartyContactProjection {
	return {
		id: partyContactIdSchema.parse(contact.id),
		organizationId: organizationIdSchema.parse(contact.organizationId),
		partyId: partyIdSchema.parse(contact.partyId),
		contactKind: contact.contactType,
		label: contact.label,
		maskedValue: maskPartyContactValue(contact.value),
		isPrimary: contact.isPrimary,
		verificationStatus: contact.verificationStatus,
		status: contact.status,
		version: contact.version,
	};
}

export function toSensitivePartyContactProjection(
	contact: PartyContact,
): SensitivePartyContactProjection {
	return {
		...toPartyContactProjection(contact),
		value: contact.value,
	};
}
