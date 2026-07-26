import { z } from "zod";

const EVENT_AGGREGATE_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const PAST_TENSE_ACTION_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*ed$/;

export const corporateAdministrationEventTypeSchema = z
	.string()
	.regex(
		/^corporate_administration\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*ed\.v[1-9]\d*$/,
	)
	.brand<"CorporateAdministrationEventType">();

export type CorporateAdministrationEventType = z.infer<
	typeof corporateAdministrationEventTypeSchema
>;

export function createCorporateAdministrationEventType(input: {
	aggregate: string;
	action: string;
	version: number;
}): CorporateAdministrationEventType {
	if (
		!EVENT_AGGREGATE_PATTERN.test(input.aggregate) ||
		!PAST_TENSE_ACTION_PATTERN.test(input.action) ||
		!Number.isSafeInteger(input.version) ||
		input.version < 1
	) {
		throw new RangeError("Invalid Corporate Administration event identity");
	}
	return corporateAdministrationEventTypeSchema.parse(
		`corporate_administration.${input.aggregate}.${input.action}.v${input.version}`,
	);
}
