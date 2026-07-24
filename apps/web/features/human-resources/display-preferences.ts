import { z } from "zod";

export const HR_LOCALES = ["en", "ms"] as const;
export type HrLocale = (typeof HR_LOCALES)[number];

export const HR_TIME_ZONES = [
	"Asia/Kuala_Lumpur",
	"Asia/Singapore",
	"UTC",
] as const;
export type HrTimeZone = (typeof HR_TIME_ZONES)[number];

const displayPreferencesSchema = z.object({
	locale: z.enum(HR_LOCALES).catch("en"),
	timeZone: z.enum(HR_TIME_ZONES).catch("Asia/Kuala_Lumpur"),
});

export type HrDisplayPreferences = z.infer<typeof displayPreferencesSchema>;

export function parseHrDisplayPreferences(input: {
	locale?: string | string[];
	timeZone?: string | string[];
}): HrDisplayPreferences {
	return displayPreferencesSchema.parse({
		locale: Array.isArray(input.locale) ? input.locale[0] : input.locale,
		timeZone: Array.isArray(input.timeZone)
			? input.timeZone[0]
			: input.timeZone,
	});
}

const messages = {
	en: {
		employeeTitle: "My HR",
		managerTitle: "Manager workspace",
		adminTitle: "HR administration",
		candidateTitle: "Candidate pipeline",
		operationsTitle: "HR operations",
		loadFailed: "HR information is temporarily unavailable. Retry shortly.",
	},
	ms: {
		employeeTitle: "HR Saya",
		managerTitle: "Ruang kerja pengurus",
		adminTitle: "Pentadbiran HR",
		candidateTitle: "Saluran calon",
		operationsTitle: "Operasi HR",
		loadFailed:
			"Maklumat HR tidak tersedia buat sementara. Cuba sebentar lagi.",
	},
} as const;

export function getHrMessages(locale: HrLocale) {
	return messages[locale];
}

export function formatHrInstant(
	value: Date | string,
	preferences: HrDisplayPreferences,
): string {
	return new Intl.DateTimeFormat(preferences.locale, {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: preferences.timeZone,
	}).format(typeof value === "string" ? new Date(value) : value);
}

export function formatHrLocalDate(
	value: Date | string,
	preferences: HrDisplayPreferences,
): string {
	return new Intl.DateTimeFormat(preferences.locale, {
		dateStyle: "medium",
		timeZone: preferences.timeZone,
	}).format(typeof value === "string" ? new Date(value) : value);
}
