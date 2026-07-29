import type { CanonicalDate } from "../kernel/dates";
import { isDateInEffectiveRange } from "../kernel/effective-range";
import type {
	ConflictDisclosure,
	OfficerDeclaration,
	OfficerDeclarationType,
	OfficerDisqualification,
	OfficerEligibilityAsOf,
} from "./compliance-types";

export const REQUIRED_OFFICER_DECLARATION_TYPES = [
	"consent",
	"eligibility",
	"fit_and_proper",
] as const satisfies readonly OfficerDeclarationType[];

export function officerDeclarationMatchesAsOf(
	declaration: Pick<
		OfficerDeclaration,
		"effectiveFrom" | "expiresOn" | "status"
	>,
	asOf: CanonicalDate,
): boolean {
	return (
		declaration.status === "active" &&
		isDateInEffectiveRange(asOf, {
			from: declaration.effectiveFrom,
			to: declaration.expiresOn,
		})
	);
}

export function officerDisqualificationMatchesAsOf(
	disqualification: Pick<
		OfficerDisqualification,
		"effectiveFrom" | "effectiveTo" | "status"
	>,
	asOf: CanonicalDate,
): boolean {
	return (
		disqualification.status === "active" &&
		isDateInEffectiveRange(asOf, {
			from: disqualification.effectiveFrom,
			to: disqualification.effectiveTo,
		})
	);
}

export function conflictMatchesMatter(
	conflict: Pick<ConflictDisclosure, "matterType" | "matterId" | "status">,
	input: {
		matterType: ConflictDisclosure["matterType"];
		matterId: string;
		includeCleared?: boolean | undefined;
	},
): boolean {
	return (
		conflict.matterType === input.matterType &&
		conflict.matterId === input.matterId &&
		(input.includeCleared === true || conflict.status !== "cleared")
	);
}

export function calculateOfficerEligibilityAsOf(input: {
	officerAppointmentId: OfficerEligibilityAsOf["officerAppointmentId"];
	asOf: CanonicalDate;
	declarations: readonly OfficerDeclaration[];
	disqualifications: readonly OfficerDisqualification[];
	requiredDeclarationTypes?: readonly OfficerDeclarationType[];
}): OfficerEligibilityAsOf {
	const currentDeclarationTypes = uniqueDeclarationTypes(
		input.declarations
			.filter((row) => officerDeclarationMatchesAsOf(row, input.asOf))
			.map((row) => row.declarationType),
	);
	const activeDisqualificationCount = input.disqualifications.filter((row) =>
		officerDisqualificationMatchesAsOf(row, input.asOf),
	).length;
	const required =
		input.requiredDeclarationTypes ?? REQUIRED_OFFICER_DECLARATION_TYPES;
	const missingDeclarationTypes = required.filter(
		(type) => !currentDeclarationTypes.includes(type),
	);
	return {
		officerAppointmentId: input.officerAppointmentId,
		asOf: input.asOf,
		eligible:
			activeDisqualificationCount === 0 && missingDeclarationTypes.length === 0,
		activeDisqualificationCount,
		currentDeclarationTypes,
		missingDeclarationTypes,
	};
}

export function declarationExpiresWithin(input: {
	declaration: OfficerDeclaration;
	asOf: CanonicalDate;
	windowDays: number;
}): boolean {
	if (
		input.declaration.status !== "active" ||
		input.declaration.expiresOn === null
	) {
		return false;
	}
	const start = new Date(`${input.asOf}T00:00:00.000Z`);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + input.windowDays);
	const expiry = new Date(`${input.declaration.expiresOn}T00:00:00.000Z`);
	return expiry >= start && expiry <= end;
}

function uniqueDeclarationTypes(
	values: readonly OfficerDeclarationType[],
): readonly OfficerDeclarationType[] {
	return [...new Set(values)].sort();
}
