import { z } from "zod";

const EVENT_NAMESPACE = "corporate_administration" as const;

const EVENT_NAME_PART_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const EVENT_ACTION_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const CORPORATE_ADMINISTRATION_EVENT_TYPE_PATTERN =
	/^corporate_administration\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.v[1-9]\d*$/;

function hasSafeEventVersion(value: string): boolean {
	const versionPrefixIndex = value.lastIndexOf(".v");
	if (versionPrefixIndex === -1) {
		return false;
	}

	const version = Number(value.slice(versionPrefixIndex + 2));
	return Number.isSafeInteger(version) && version >= 1;
}

function hasApprovedActionSuffix(value: string): boolean {
	const parts = value.split(".");
	const action = parts.at(2);
	return (
		action !== undefined &&
		(action.endsWith("ed") || action.endsWith("_set") || action === "set")
	);
}

/**
 * Event types follow an explicit Corporate Administration naming convention:
 * corporate_administration.<aggregate>.<action>.v<version>.
 *
 * The action segment must end in "ed" by convention; this is not true English
 * tense validation.
 *
 * CA-0.4 registers only the draft legal-company event identity. Publishing,
 * consuming, retry workers, and external event-bus clients remain outside the
 * package boundary.
 */
export const corporateAdministrationEventTypeSchema = z
	.string()
	.regex(
		CORPORATE_ADMINISTRATION_EVENT_TYPE_PATTERN,
		"Expected a versioned Corporate Administration event type",
	)
	.refine(
		hasSafeEventVersion,
		"Corporate Administration event version must be a positive safe integer",
	)
	.refine(
		hasApprovedActionSuffix,
		"Corporate Administration event action must end with 'ed' or '_set'",
	)
	.brand<"CorporateAdministrationEventType">();

export type CorporateAdministrationEventType = z.infer<
	typeof corporateAdministrationEventTypeSchema
>;

export const CORPORATE_ADMINISTRATION_EVENT_TYPES = [
	"corporate_administration.legal_company.draft_registered.v1",
	"corporate_administration.legal_company.profile_updated.v1",
	"corporate_administration.legal_company.jurisdiction_profile_set.v1",
	"corporate_administration.legal_company.name_added.v1",
	"corporate_administration.legal_company.name_superseded.v1",
	"corporate_administration.legal_company.name_retired.v1",
	"corporate_administration.legal_company.legal_form_changed.v1",
	"corporate_administration.legal_company.identifier_registered.v1",
	"corporate_administration.legal_company.identifier_retired.v1",
	"corporate_administration.legal_company.financial_year_set.v1",
	"corporate_administration.legal_company.activity_registered.v1",
	"corporate_administration.legal_company.activity_ended.v1",
	"corporate_administration.legal_company.activated.v1",
	"corporate_administration.legal_company.suspended.v1",
	"corporate_administration.legal_company.struck_off_marked.v1",
	"corporate_administration.legal_company.liquidation_entered.v1",
	"corporate_administration.legal_company.dissolved.v1",
	"corporate_administration.legal_company.restored.v1",
	"corporate_administration.legal_company.archived.v1",
	"corporate_administration.legal_establishment.registered.v1",
	"corporate_administration.legal_establishment.updated.v1",
	"corporate_administration.legal_establishment.status_changed.v1",
	"corporate_administration.registered_address.set.v1",
	"corporate_administration.premise.registered.v1",
	"corporate_administration.premise.ended.v1",
	"corporate_administration.governance_body.created.v1",
	"corporate_administration.governance_body.amended.v1",
	"corporate_administration.governance_body.retired.v1",
	"corporate_administration.governance_membership.appointed.v1",
	"corporate_administration.governance_membership.changed.v1",
	"corporate_administration.governance_membership.ended.v1",
	"corporate_administration.statutory_office.defined.v1",
	"corporate_administration.officer.appointed.v1",
	"corporate_administration.officer.appointment_amended.v1",
	"corporate_administration.officer.qualification_recorded.v1",
	"corporate_administration.officer.resigned.v1",
	"corporate_administration.officer.removed.v1",
	"corporate_administration.officer.declaration_recorded.v1",
	"corporate_administration.officer.declaration_superseded.v1",
	"corporate_administration.officer.disqualified.v1",
	"corporate_administration.officer.disqualification_ended.v1",
	"corporate_administration.conflict.disclosed.v1",
	"corporate_administration.conflict.recusal_recorded.v1",
	"corporate_administration.governance_meeting.scheduled.v1",
	"corporate_administration.meeting_notice.issued.v1",
	"corporate_administration.meeting_notice.delivered.v1",
	"corporate_administration.meeting_notice.waived.v1",
	"corporate_administration.meeting_participant.recorded.v1",
	"corporate_administration.governance_meeting.opened.v1",
	"corporate_administration.governance_meeting.quorum_recorded.v1",
	"corporate_administration.governance_meeting.adjourned.v1",
	"corporate_administration.governance_meeting.closed.v1",
	"corporate_administration.meeting_vote.recorded.v1",
	"corporate_administration.resolution.adopted.v1",
	"corporate_administration.resolution.rejected.v1",
	"corporate_administration.resolution.superseded.v1",
	"corporate_administration.resolution.minutes_recorded.v1",
	"corporate_administration.resolution.action_assigned.v1",
	"corporate_administration.resolution.action_completed.v1",
	"corporate_administration.authority_mandate.granted.v1",
	"corporate_administration.authority_mandate.amended.v1",
	"corporate_administration.authority_mandate.revoked.v1",
] as const;

export type CorporateAdministrationRegisteredEventType =
	(typeof CORPORATE_ADMINISTRATION_EVENT_TYPES)[number];

export type CreateCorporateAdministrationEventTypeInput = Readonly<{
	aggregate: string;
	action: string;
	version: number;
}>;

export function createCorporateAdministrationEventType(
	input: CreateCorporateAdministrationEventTypeInput,
): CorporateAdministrationEventType {
	if (!EVENT_NAME_PART_PATTERN.test(input.aggregate)) {
		throw new RangeError(
			"Corporate Administration event aggregate must use lowercase snake_case",
		);
	}

	if (
		!(
			EVENT_ACTION_PATTERN.test(input.action) &&
			(input.action.endsWith("ed") ||
				input.action.endsWith("_set") ||
				input.action === "set")
		)
	) {
		throw new RangeError(
			"Corporate Administration event action must use lowercase snake_case and end with 'ed' or '_set'",
		);
	}

	if (!Number.isSafeInteger(input.version) || input.version < 1) {
		throw new RangeError(
			"Corporate Administration event version must be a positive safe integer",
		);
	}

	return corporateAdministrationEventTypeSchema.parse(
		`${EVENT_NAMESPACE}.${input.aggregate}.${input.action}.v${input.version}`,
	);
}
