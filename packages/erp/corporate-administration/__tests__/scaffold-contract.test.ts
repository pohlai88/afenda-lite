import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PartyId, TaxRegistrationId } from "@afenda/master-data";
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
	AccountingReferencePort,
	ApprovalDecisionPort,
	ClockPort,
	ComplianceRuleSourcePort,
	CorporateAdministrationClockedQueryOptions,
	CorporateAdministrationCommandOptions,
	CorporateAdministrationPaginatedQueryOptions,
	CorporateAdministrationQueryOptions,
	DocumentObjectPort,
	PartyReference,
	PartyReferencePort,
	PaymentsReferencePort,
	ProtectedIdentityPort,
	ReferenceDataPort,
	ReminderDispatchPort,
	SearchProjectionPort,
	SignatureEnvelopePort,
	TaxRegistrationReadPort,
	TaxRegistrationReference,
} from "../src/index";
import { corporateAdministrationModuleManifest } from "../src/module.manifest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const sourceRoot = path.join(packageRoot, "src");

function listTypeScriptFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const target = path.join(directory, entry);
		return statSync(target).isDirectory()
			? listTypeScriptFiles(target)
			: target.endsWith(".ts")
				? [target]
				: [];
	});
}

const EXPECTED_RUNTIME_EXPORTS = [
	"CORPORATE_ADMINISTRATION_COMMAND_IDS",
	"CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS",
	"CORPORATE_ADMINISTRATION_ERROR_CODES",
	"CORPORATE_ADMINISTRATION_PERMISSION_CODES",
	"CORPORATE_ADMINISTRATION_QUERY_IDS",
	"CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS",
	"CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON",
	"DEFAULT_CURSOR_PAGE_SIZE",
	"MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH",
	"MAX_CURSOR_PAGE_SIZE",
	"PROTECTED_IDENTITY_FIELDS",
	"approvalDecisionIdSchema",
	"approvalRequestIdSchema",
	"canonicalDateSchema",
	"canonicalDecimalSchema",
	"canonicalJsonStringify",
	"causationIdSchema",
	"commandFingerprintSchema",
	"compareCanonicalDates",
	"corporateAdministrationErrorDetails",
	"corporateAdministrationEventTypeSchema",
	"corporateAdministrationResultCode",
	"correlationIdSchema",
	"createCanonicalFingerprint",
	"createCorporateAdministrationEventType",
	"cursorPaginationSchema",
	"decimalInputSchema",
	"documentObjectRefSchema",
	"effectiveRangeSchema",
	"effectiveRangesOverlap",
	"idempotencyKeySchema",
	"isCanonicalDate",
	"isDateInEffectiveRange",
	"legalCompanyIdSchema",
	"legalEstablishmentIdSchema",
	"normalizeCorporateAdministrationCode",
	"normalizeDecimalString",
	"normalizedCodeSchema",
	"opaqueCursorSchema",
	"organizationIdSchema",
	"requireCorporateAdministrationPermission",
	"userIdSchema",
] as const;

describe("Corporate Administration CA-0.2 package contract", () => {
	it("publishes contract metadata without fabricating runtime capability", () => {
		expect(corporateAdministrationModuleManifest).toMatchObject({
			id: "corporate-administration",
			category: "erp",
			packageName: "@afenda/corporate-administration",
			band: "R1-F",
			lifecycle: "scaffolded",
			activationMode: "organization_toggle",
			persistence: {
				schemaOwner: "@afenda/db",
				mutationTables: [],
			},
			events: {
				namespace: "corporate_administration",
				emits: [],
				consumes: [],
			},
		});
		expect(corporateAdministrationModuleManifest.owns.aggregates).toEqual([]);
		expect(corporateAdministrationModuleManifest.owns.commands).toEqual([]);
		expect(corporateAdministrationModuleManifest.owns.queries).toEqual([]);
		expect(
			corporateAdministrationModuleManifest.permissions.codes,
		).toHaveLength(52);
		expect(corporateAdministrationModuleManifest.authorization).toEqual({
			commands: {},
			queries: {},
		});
	});

	it("exports exactly the consumer-safe runtime contracts", () => {
		const barrel = readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
		const runtimeExports = [
			...barrel.matchAll(/export\s+\{([\s\S]*?)\}\s+from/g),
		]
			.flatMap((match) => (match[1] ?? "").split(","))
			.map((name) => name.trim())
			.filter(Boolean);

		expect(runtimeExports.sort()).toEqual([...EXPECTED_RUNTIME_EXPORTS].sort());
		expect(barrel).not.toContain("createDrizzleCorporateAdministrationStore");
		expect(barrel).not.toContain("createMemoryStore");
	});

	it("publishes only the root and governance manifest subpath", () => {
		const packageJson = JSON.parse(
			readFileSync(path.join(packageRoot, "package.json"), "utf8"),
		) as { exports?: Record<string, unknown> };

		expect(Object.keys(packageJson.exports ?? {}).sort()).toEqual([
			".",
			"./module-manifest",
		]);
	});

	it("declares approved dependencies without lateral ERP packages", () => {
		const packageJson = JSON.parse(
			readFileSync(path.join(packageRoot, "package.json"), "utf8"),
		) as { dependencies?: Record<string, string> };

		expect(packageJson.dependencies).toEqual({
			"@afenda/audit": "workspace:*",
			"@afenda/db": "workspace:*",
			"@afenda/errors": "workspace:*",
			"@afenda/events": "workspace:*",
			"@afenda/master-data": "workspace:*",
			"server-only": "catalog:",
			zod: "catalog:",
		});
	});

	it("contains no Next.js, HTTP, app, UI, peer ERP, or deep package imports", () => {
		const findings = listTypeScriptFiles(sourceRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			const forbidden = [
				/from\s+["']next(?:\/[^"']*)?["']/,
				/from\s+["']@afenda\/ui(?:-system)?(?:\/[^"']*)?["']/,
				/from\s+["'](?:@\/|apps\/)/,
				/from\s+["']@afenda\/(?:accounting|payments|human-resources)(?:\/[^"']*)?["']/,
				/from\s+["']@afenda\/[^"']+\/src\//,
			];
			return forbidden.some((pattern) => pattern.test(source))
				? [path.relative(packageRoot, file)]
				: [];
		});

		expect(findings).toEqual([]);
	});

	it("reuses public Master Data identities through ports", () => {
		expectTypeOf<PartyReference["partyId"]>().toEqualTypeOf<PartyId>();
		expectTypeOf<
			TaxRegistrationReference["taxRegistrationId"]
		>().toEqualTypeOf<TaxRegistrationId>();
		expectTypeOf<PartyReferencePort["resolveParty"]>().toBeFunction();
		expectTypeOf<
			TaxRegistrationReadPort["listEffectiveForParty"]
		>().toBeFunction();

		const portsSource = readFileSync(path.join(sourceRoot, "ports.ts"), "utf8");
		const brandsSource = readFileSync(
			path.join(sourceRoot, "kernel", "brands.ts"),
			"utf8",
		);
		expect(portsSource).toMatch(/from "@afenda\/master-data"/);
		expect(portsSource).not.toMatch(/@afenda\/master-data\/src\//);
		expect(brandsSource).not.toMatch(/brand<"(?:PartyId|TaxRegistrationId)">/);
	});

	it("exports every required and optional port contract", () => {
		expectTypeOf<ReferenceDataPort["getCountryByCode"]>().toBeFunction();
		expectTypeOf<
			ProtectedIdentityPort["resolveFilingSafeIdentity"]
		>().toBeFunction();
		expectTypeOf<ApprovalDecisionPort["verifyDecision"]>().toBeFunction();
		expectTypeOf<DocumentObjectPort["resolveObject"]>().toBeFunction();
		expectTypeOf<ClockPort["now"]>().toBeFunction();
		expectTypeOf<SearchProjectionPort["upsert"]>().toBeFunction();
		expectTypeOf<ReminderDispatchPort["dispatch"]>().toBeFunction();
		expectTypeOf<
			AccountingReferencePort["validateJournalReference"]
		>().toBeFunction();
		expectTypeOf<
			PaymentsReferencePort["validatePaymentReference"]
		>().toBeFunction();
		expectTypeOf<SignatureEnvelopePort["getEnvelope"]>().toBeFunction();
		expectTypeOf<ComplianceRuleSourcePort["getRulePack"]>().toBeFunction();
	});

	it("keeps trusted command and query context separate from payloads", () => {
		expectTypeOf<keyof CorporateAdministrationCommandOptions>().toEqualTypeOf<
			| "organizationId"
			| "actorUserId"
			| "correlationId"
			| "causationId"
			| "idempotencyKey"
			| "requestInstant"
			| "authorization"
			| "approvalDecisionId"
		>();
		expectTypeOf<keyof CorporateAdministrationQueryOptions>().toEqualTypeOf<
			"organizationId" | "actorUserId" | "correlationId" | "authorization"
		>();
		expectTypeOf<
			CorporateAdministrationPaginatedQueryOptions["pagination"]
		>().toBeObject();
		expectTypeOf<
			CorporateAdministrationClockedQueryOptions["clock"]
		>().toEqualTypeOf<ClockPort>();
	});
});
