/** Compensation agreement fields subject to tiered read projection. */
export const EMPLOYEE_COMPENSATION_QUERY_FIELDS = [
	"baseAmount",
	"currencyCode",
	"payFrequency",
	"confidentialNote",
	"gradeId",
	"salaryBandId",
	"effectiveFrom",
	"effectiveTo",
] as const;
