import type { CanonicalDate } from "../../kernel/dates";
import { isDateInEffectiveRange } from "../../kernel/effective-range";
import type { AuthorityMandate } from "./types";

export function authorityMandateMatchesAsOf(
	mandate: Pick<AuthorityMandate, "effectiveFrom" | "effectiveTo" | "status">,
	asOf: CanonicalDate,
): boolean {
	return (
		mandate.status === "active" &&
		isDateInEffectiveRange(asOf, {
			from: mandate.effectiveFrom,
			to: mandate.effectiveTo,
		})
	);
}
