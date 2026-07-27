import {
	type CanonicalJsonValue,
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_ERROR_CODES,
	CORPORATE_ADMINISTRATION_MODULE_ID,
	CORPORATE_ADMINISTRATION_PACKAGE_NAME,
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
	type CorporateAdministrationCommandId,
	type CorporateAdministrationQueryId,
	type CursorPage,
	canonicalDateSchema,
	canonicalDecimalSchema,
	causationIdSchema,
	commandFingerprintSchema,
	compareCanonicalDates,
	corporateAdministrationEventTypeSchema,
	correlationIdSchema,
	createCanonicalFingerprint,
	createCorporateAdministrationEventType,
	cursorPaginationSchema,
	DEFAULT_CURSOR_PAGE_SIZE,
	decimalInputSchema,
	effectiveRangeContainsRange,
	effectiveRangeEndsBeforeOrAt,
	effectiveRangeSchema,
	effectiveRangeStartsAfter,
	effectiveRangesOverlap,
	eventIdSchema,
	idempotencyKeySchema,
	isCanonicalDate,
	isDateInEffectiveRange,
	isOpenEffectiveRange,
	MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH,
	MAX_CURSOR_PAGE_SIZE,
	MAX_OPAQUE_CURSOR_LENGTH,
	normalizeCorporateAdministrationCode,
	normalizeDecimalString,
	normalizedCodeSchema,
	type OpaqueCursor,
	opaqueCursorSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
	approvalDecisionIdSchema,
	approvalRequestIdSchema,
	documentObjectRefSchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
} from "../src/kernel/brands";
import { canonicalJsonStringify } from "../src/kernel/canonical-json";

describe("Corporate Administration CA-0.1 core contracts", () => {
	it("keeps the approved module identity with CA-1.4 IDs", () => {
		expect(CORPORATE_ADMINISTRATION_MODULE_ID).toBe("corporate-administration");
		expect(CORPORATE_ADMINISTRATION_PACKAGE_NAME).toBe(
			"@afenda/corporate-administration",
		);
		expect(CORPORATE_ADMINISTRATION_COMMAND_IDS).toEqual([
			"registerLegalCompanyDraft",
			"updateLegalCompanyProfile",
			"addCompanyName",
			"supersedeCompanyName",
			"retireCompanyName",
			"setCompanyJurisdictionProfile",
			"supersedeCompanyJurisdictionProfile",
			"setCompanyLegalForm",
			"supersedeCompanyLegalForm",
			"registerCompanyIdentifier",
			"supersedeCompanyIdentifier",
			"retireCompanyIdentifier",
			"setCompanyFinancialYear",
			"registerCompanyActivity",
			"endCompanyActivity",
			"registerLegalEstablishment",
			"updateLegalEstablishment",
			"activateLegalEstablishment",
			"suspendLegalEstablishment",
			"closeLegalEstablishment",
			"setRegisteredAddress",
			"registerPremise",
			"endPremise",
		]);
		expect(CORPORATE_ADMINISTRATION_QUERY_IDS).toEqual([
			"getLegalCompany",
			"listLegalCompanies",
			"listCompanyNames",
			"findCompanyNameAsOf",
			"findCompanyJurisdictionProfileAsOf",
			"findCompanyLegalFormAsOf",
			"listCompanyIdentifiers",
			"findCompanyIdentifierAsOf",
			"findCompanyFinancialYearAsOf",
			"listCompanyActivitiesAsOf",
			"getLegalCompanyTimeline",
			"getLegalEstablishment",
			"listLegalEstablishmentsAsOf",
			"findRegisteredAddressAsOf",
			"listPremisesAsOf",
		]);
		expectTypeOf<CorporateAdministrationCommandId>().toEqualTypeOf<
			| "registerLegalCompanyDraft"
			| "updateLegalCompanyProfile"
			| "addCompanyName"
			| "supersedeCompanyName"
			| "retireCompanyName"
			| "setCompanyJurisdictionProfile"
			| "supersedeCompanyJurisdictionProfile"
			| "setCompanyLegalForm"
			| "supersedeCompanyLegalForm"
			| "registerCompanyIdentifier"
			| "supersedeCompanyIdentifier"
			| "retireCompanyIdentifier"
			| "setCompanyFinancialYear"
			| "registerCompanyActivity"
			| "endCompanyActivity"
			| "registerLegalEstablishment"
			| "updateLegalEstablishment"
			| "activateLegalEstablishment"
			| "suspendLegalEstablishment"
			| "closeLegalEstablishment"
			| "setRegisteredAddress"
			| "registerPremise"
			| "endPremise"
		>();
		expectTypeOf<CorporateAdministrationQueryId>().toEqualTypeOf<
			| "getLegalCompany"
			| "listLegalCompanies"
			| "listCompanyNames"
			| "findCompanyNameAsOf"
			| "findCompanyJurisdictionProfileAsOf"
			| "findCompanyLegalFormAsOf"
			| "listCompanyIdentifiers"
			| "findCompanyIdentifierAsOf"
			| "findCompanyFinancialYearAsOf"
			| "listCompanyActivitiesAsOf"
			| "getLegalCompanyTimeline"
			| "getLegalEstablishment"
			| "listLegalEstablishmentsAsOf"
			| "findRegisteredAddressAsOf"
			| "listPremisesAsOf"
		>();
	});

	it("brands tenant identity and validates canonical dates", () => {
		expect(organizationIdSchema.parse("org_123")).toBe("org_123");
		expect(() => organizationIdSchema.parse(" ")).toThrow();
		expect(canonicalDateSchema.parse("2026-02-28")).toBe("2026-02-28");
		expect(() => canonicalDateSchema.parse("2026-02-30")).toThrow();
	});

	it("accepts exact canonical dates for business years 0001-9999 only", () => {
		expect(canonicalDateSchema.parse("0001-01-01")).toBe("0001-01-01");
		expect(canonicalDateSchema.parse("0099-12-31")).toBe("0099-12-31");
		expect(canonicalDateSchema.parse("2000-02-29")).toBe("2000-02-29");
		expect(canonicalDateSchema.parse("2024-02-29")).toBe("2024-02-29");
		expect(canonicalDateSchema.parse("9999-12-31")).toBe("9999-12-31");

		for (const value of [
			"0000-01-01",
			" 2026-01-01",
			"2026-01-01 ",
			"2026-1-01",
			"2026-01-1",
			"2026-02-29",
			"1900-02-29",
			"2026-01-01T00:00:00.000Z",
			"2024-13-01",
			"2024-00-01",
			"2024-01-00",
		]) {
			expect(canonicalDateSchema.safeParse(value).success).toBe(false);
			expect(isCanonicalDate(value)).toBe(false);
		}

		expect(isCanonicalDate("2024-02-29")).toBe(true);
	});

	it("compares canonical dates lexically with -1, 0, or 1", () => {
		const earlier = canonicalDateSchema.parse("2026-01-01");
		const same = canonicalDateSchema.parse("2026-01-01");
		const later = canonicalDateSchema.parse("2026-01-02");

		expect(compareCanonicalDates(earlier, later)).toBe(-1);
		expect(compareCanonicalDates(earlier, same)).toBe(0);
		expect(compareCanonicalDates(later, earlier)).toBe(1);
	});

	it("brands opaque identifiers only after trimming and bounded validation", () => {
		const maxOpaqueIdentifier = "x".repeat(128);
		const tooLongOpaqueIdentifier = "x".repeat(129);

		for (const schema of [
			organizationIdSchema,
			userIdSchema,
			eventIdSchema,
			correlationIdSchema,
			causationIdSchema,
			idempotencyKeySchema,
			documentObjectRefSchema,
		]) {
			expect(schema.parse(" id-123 ")).toBe("id-123");
			expect(schema.parse(maxOpaqueIdentifier)).toBe(maxOpaqueIdentifier);
			expect(schema.safeParse("   ").success).toBe(false);
			expect(schema.safeParse(tooLongOpaqueIdentifier).success).toBe(false);
		}

		expect(eventIdSchema.parse("event_1")).toBe("event_1");
		expect(eventIdSchema.safeParse("not-a-uuid").success).toBe(true);
	});

	it("brands UUID identifiers without generating values", () => {
		const uuid = "018f2d7a-9f65-768a-bf28-2373bb9f2846";

		for (const schema of [
			legalCompanyIdSchema,
			legalEstablishmentIdSchema,
			approvalRequestIdSchema,
			approvalDecisionIdSchema,
		]) {
			expect(schema.parse(uuid)).toBe(uuid);
			expect(schema.safeParse("not-a-uuid").success).toBe(false);
			expect(schema.safeParse("").success).toBe(false);
		}
	});

	it("brands command fingerprints only for lowercase SHA-256 hex strings", () => {
		const fingerprint = "a".repeat(64);

		expect(commandFingerprintSchema.parse(fingerprint)).toBe(fingerprint);
		expect(commandFingerprintSchema.safeParse("A".repeat(64)).success).toBe(
			false,
		);
		expect(commandFingerprintSchema.safeParse("g".repeat(64)).success).toBe(
			false,
		);
		expect(commandFingerprintSchema.safeParse("a".repeat(63)).success).toBe(
			false,
		);
		expect(commandFingerprintSchema.safeParse("a".repeat(65)).success).toBe(
			false,
		);
	});

	it("normalizes decimal and code inputs deterministically", () => {
		expect(decimalInputSchema.parse("+001.2300")).toBe("1.23");
		expect(decimalInputSchema.parse("-0.000")).toBe("0");
		expect(canonicalDecimalSchema.safeParse("1e3").success).toBe(false);
		expect(normalizeCorporateAdministrationCode(" acme-01 ")).toEqual({
			code: "acme-01",
			normalizedCode: "ACME-01",
		});
	});

	it("normalizes plain base-10 decimal strings without numeric conversion", () => {
		expect(normalizeDecimalString("+0")).toBe("0");
		expect(normalizeDecimalString("-0")).toBe("0");
		expect(normalizeDecimalString("00012")).toBe("12");
		expect(normalizeDecimalString("0012.3400")).toBe("12.34");
		expect(normalizeDecimalString("-000.5000")).toBe("-0.5");
		expect(normalizeDecimalString("+10.000")).toBe("10");
		expect(decimalInputSchema.parse("-000.5000")).toBe("-0.5");
	});

	it("rejects non-plain or whitespace-padded decimal inputs", () => {
		for (const value of [
			".5",
			"1.",
			"1e3",
			"1,000",
			" 1",
			"1 ",
			"NaN",
			"Infinity",
			"-Infinity",
		]) {
			expect(() => normalizeDecimalString(value)).toThrow(RangeError);
			expect(decimalInputSchema.safeParse(value).success).toBe(false);
			expect(canonicalDecimalSchema.safeParse(value).success).toBe(false);
		}
	});

	it("keeps canonical decimal safeParse non-throwing", () => {
		for (const value of ["abc", "1e3", ".5", "1.", "001.20", "-0"]) {
			expect(() => canonicalDecimalSchema.safeParse(value)).not.toThrow();
			expect(canonicalDecimalSchema.safeParse(value).success).toBe(false);
		}
	});

	it("validates normalized corporate administration code syntax", () => {
		for (const value of [
			"CA",
			"CA-001",
			"COMPANY.CODE",
			"BRANCH_01",
			"A1-B2.C3_D4",
		]) {
			expect(normalizedCodeSchema.safeParse(value).success).toBe(true);
		}

		for (const value of [
			"",
			"ca-001",
			"CA 001",
			"CA/001",
			"CA@001",
			"\u516c\u53f8-01",
		]) {
			expect(normalizedCodeSchema.safeParse(value).success).toBe(false);
		}
	});

	it("normalizes corporate administration codes with display preservation", () => {
		expect(normalizeCorporateAdministrationCode("Company.A")).toEqual({
			code: "Company.A",
			normalizedCode: "COMPANY.A",
		});
		expect(normalizeCorporateAdministrationCode("branch_02")).toEqual({
			code: "branch_02",
			normalizedCode: "BRANCH_02",
		});
		expect(normalizeCorporateAdministrationCode("ca-001").normalizedCode).toBe(
			normalizeCorporateAdministrationCode("CA-001").normalizedCode,
		);
	});

	it("returns readonly normalized code values", () => {
		const result = normalizeCorporateAdministrationCode(" ca-01 ");

		expect(result).toEqual({
			code: "ca-01",
			normalizedCode: "CA-01",
		});
		expect(Object.isFrozen(result)).toBe(true);
	});

	it("normalizes display codes with NFC before validating characters", () => {
		expect(() => normalizeCorporateAdministrationCode(" cafe\u0301 ")).toThrow(
			RangeError,
		);
	});

	it("rejects invalid corporate administration code input with RangeError", () => {
		expect(() => normalizeCorporateAdministrationCode("   ")).toThrow(
			RangeError,
		);
		expect(() => normalizeCorporateAdministrationCode("CA/001")).toThrow(
			RangeError,
		);
		expect(() => normalizeCorporateAdministrationCode("CA 001")).toThrow(
			RangeError,
		);
		expect(() =>
			normalizeCorporateAdministrationCode("\u516c\u53f8-01"),
		).toThrow(RangeError);
	});

	it("enforces corporate administration code length after normalization", () => {
		const maxLengthCode = "A".repeat(MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH);
		const tooLongCode = "A".repeat(
			MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH + 1,
		);

		expect(normalizeCorporateAdministrationCode(maxLengthCode)).toEqual({
			code: maxLengthCode,
			normalizedCode: maxLengthCode,
		});
		expect(() => normalizeCorporateAdministrationCode(tooLongCode)).toThrow(
			RangeError,
		);
		expect(() => normalizeCorporateAdministrationCode("ß".repeat(64))).toThrow(
			RangeError,
		);
	});

	it("validates half-open effective ranges and overlap", () => {
		const first = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: "2026-02-01",
		});
		const touching = effectiveRangeSchema.parse({
			from: "2026-02-01",
			to: null,
		});
		expect(effectiveRangesOverlap(first, touching)).toBe(false);
		expect(() =>
			effectiveRangeSchema.parse({ from: "2026-02-01", to: "2026-02-01" }),
		).toThrow();
		expect(
			effectiveRangeSchema.safeParse({
				from: "2026-02-01",
				to: "2026-01-01",
			}).success,
		).toBe(false);
	});

	it("returns readonly effective range objects", () => {
		const range = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: null,
		});

		expect(Object.isFrozen(range)).toBe(true);
	});

	it("detects effective-range overlap with half-open boundaries", () => {
		const first = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: "2026-03-01",
		});
		const intersecting = effectiveRangeSchema.parse({
			from: "2026-02-01",
			to: "2026-04-01",
		});
		const adjacent = effectiveRangeSchema.parse({
			from: "2026-03-01",
			to: "2026-04-01",
		});
		const separated = effectiveRangeSchema.parse({
			from: "2026-04-01",
			to: "2026-05-01",
		});
		const current = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: null,
		});

		expect(effectiveRangesOverlap(first, intersecting)).toBe(true);
		expect(effectiveRangesOverlap(intersecting, first)).toBe(true);
		expect(effectiveRangesOverlap(first, adjacent)).toBe(false);
		expect(effectiveRangesOverlap(adjacent, first)).toBe(false);
		expect(effectiveRangesOverlap(first, separated)).toBe(false);
		expect(effectiveRangesOverlap(current, separated)).toBe(true);
	});

	it("checks date and range containment with half-open boundaries", () => {
		const range = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: "2026-02-01",
		});
		const contained = effectiveRangeSchema.parse({
			from: "2026-01-10",
			to: "2026-01-20",
		});
		const overhanging = effectiveRangeSchema.parse({
			from: "2026-01-10",
			to: "2026-03-01",
		});
		const open = effectiveRangeSchema.parse({
			from: "2026-01-01",
			to: null,
		});

		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2026-01-01"), range),
		).toBe(true);
		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2026-01-31"), range),
		).toBe(true);
		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2026-02-01"), range),
		).toBe(false);
		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2025-12-31"), range),
		).toBe(false);
		expect(isOpenEffectiveRange(open)).toBe(true);
		expect(isOpenEffectiveRange(range)).toBe(false);
		expect(
			effectiveRangeEndsBeforeOrAt(
				range,
				canonicalDateSchema.parse("2026-02-01"),
			),
		).toBe(true);
		expect(
			effectiveRangeStartsAfter(
				contained,
				canonicalDateSchema.parse("2026-01-01"),
			),
		).toBe(true);
		expect(effectiveRangeContainsRange(range, contained)).toBe(true);
		expect(effectiveRangeContainsRange(range, overhanging)).toBe(false);
		expect(effectiveRangeContainsRange(open, overhanging)).toBe(true);
	});

	it("produces canonical JSON and a stable SHA-256 fingerprint", () => {
		const left = { z: [3, 2, 1], a: { y: true, x: null } };
		const right = { a: { x: null, y: true }, z: [3, 2, 1] };
		expect(canonicalJsonStringify(left)).toBe(
			'{"a":{"x":null,"y":true},"z":[3,2,1]}',
		);
		expect(createCanonicalFingerprint(left)).toBe(
			createCanonicalFingerprint(right),
		);
		expect(createCanonicalFingerprint(left)).toMatch(/^[0-9a-f]{64}$/);
	});

	it("sorts canonical JSON object keys recursively and preserves array order", () => {
		expect(
			canonicalJsonStringify({
				z: 1,
				nested: {
					b: 2,
					a: 1,
				},
				a: 3,
			}),
		).toBe('{"a":3,"nested":{"a":1,"b":2},"z":1}');
		expect(canonicalJsonStringify(["b", "a"])).toBe('["b","a"]');
	});

	it("allows repeated non-cyclic references while rejecting cycles", () => {
		const shared = { value: 1 };
		const cyclic: Record<string, CanonicalJsonValue> = {};
		cyclic.self = cyclic;

		expect(canonicalJsonStringify({ left: shared, right: shared })).toBe(
			'{"left":{"value":1},"right":{"value":1}}',
		);
		expect(() => canonicalJsonStringify(cyclic)).toThrow(
			"Canonical JSON rejects cyclic values",
		);
	});

	it("rejects sparse and unsupported array entries", () => {
		expect(() => canonicalJsonStringify(new Array<null>(2))).toThrow(
			"Canonical JSON rejects sparse arrays",
		);
		expect(() =>
			canonicalJsonStringify([undefined] as unknown as CanonicalJsonValue),
		).toThrow("Canonical JSON rejects undefined");
	});

	it("rejects values that native JSON would silently omit", () => {
		const unsupportedValues = [
			undefined,
			BigInt(1),
			Symbol("private"),
			() => "unsupported",
		];

		for (const value of unsupportedValues) {
			expect(() =>
				canonicalJsonStringify(value as unknown as CanonicalJsonValue),
			).toThrow();
			expect(() =>
				canonicalJsonStringify({ value } as unknown as CanonicalJsonValue),
			).toThrow();
		}
	});

	it("rejects non-plain objects", () => {
		class DomainValue {
			readonly amount = 100;
		}

		for (const value of [
			new DomainValue(),
			new Date("2026-01-01T00:00:00.000Z"),
			new Map([["a", 1]]),
			new Set([1]),
		]) {
			expect(() =>
				canonicalJsonStringify(value as unknown as CanonicalJsonValue),
			).toThrow("Canonical JSON accepts only arrays and plain objects");
		}
	});

	it("rejects array object properties instead of omitting them", () => {
		const value = ["a"] as string[] & { extra?: string };
		value.extra = "b";

		expect(() =>
			canonicalJsonStringify(value as unknown as CanonicalJsonValue),
		).toThrow("Canonical JSON rejects array object properties");
	});

	it("serializes own plain-object fields without relying on enumerability", () => {
		const value: Record<string, CanonicalJsonValue> = {};
		Object.defineProperty(value, "hidden", {
			value: 1,
			enumerable: false,
		});

		expect(canonicalJsonStringify(value)).toBe('{"hidden":1}');
	});

	it("rejects accessor properties without invoking them", () => {
		let invoked = false;
		const value = {
			get amount() {
				invoked = true;
				return 100;
			},
		};

		expect(() => canonicalJsonStringify(value)).toThrow(
			"Canonical JSON rejects accessor properties",
		);
		expect(invoked).toBe(false);
	});

	it("rejects symbol-keyed properties", () => {
		const key = Symbol("private");
		const value = {
			value: 1,
			[key]: 2,
		};

		expect(() => canonicalJsonStringify(value)).toThrow(
			"Canonical JSON rejects symbol-keyed properties",
		);
	});

	it("rejects non-finite numbers and normalizes negative zero", () => {
		expect(() => canonicalJsonStringify(NaN)).toThrow(
			"Canonical JSON rejects non-finite numbers",
		);
		expect(() => canonicalJsonStringify(Infinity)).toThrow(
			"Canonical JSON rejects non-finite numbers",
		);
		expect(() => canonicalJsonStringify(-Infinity)).toThrow(
			"Canonical JSON rejects non-finite numbers",
		);
		expect(canonicalJsonStringify(-0)).toBe("0");
	});

	it("validates opaque cursors with trimming and bounded length", () => {
		expect(DEFAULT_CURSOR_PAGE_SIZE).toBe(50);
		expect(MAX_CURSOR_PAGE_SIZE).toBe(100);
		expect(MAX_OPAQUE_CURSOR_LENGTH).toBe(1024);
		expect(opaqueCursorSchema.parse("cursor-123")).toBe("cursor-123");
		expect(opaqueCursorSchema.parse(" cursor-123 ")).toBe("cursor-123");
		expect(opaqueCursorSchema.parse("x".repeat(MAX_OPAQUE_CURSOR_LENGTH))).toBe(
			"x".repeat(MAX_OPAQUE_CURSOR_LENGTH),
		);
		expect(opaqueCursorSchema.safeParse("   ").success).toBe(false);
		expect(
			opaqueCursorSchema.safeParse("x".repeat(MAX_OPAQUE_CURSOR_LENGTH + 1))
				.success,
		).toBe(false);
	});

	it("applies cursor pagination defaults and preserves strict numeric limits", () => {
		const defaultPagination = cursorPaginationSchema.parse({});

		expect(defaultPagination).toEqual({
			limit: DEFAULT_CURSOR_PAGE_SIZE,
		});
		expect(Object.isFrozen(defaultPagination)).toBe(true);
		expect(
			cursorPaginationSchema.parse({
				cursor: "cursor-123",
				limit: 25,
			}),
		).toEqual({
			cursor: "cursor-123",
			limit: 25,
		});

		for (const limit of [0, -1, 1.5, MAX_CURSOR_PAGE_SIZE + 1]) {
			expect(cursorPaginationSchema.safeParse({ limit }).success).toBe(false);
		}

		expect(
			cursorPaginationSchema.safeParse({ limit: MAX_CURSOR_PAGE_SIZE }).success,
		).toBe(true);
		expect(
			cursorPaginationSchema.safeParse({
				limit: "25",
			}).success,
		).toBe(false);
	});

	it("types cursor pages with readonly items and null completion cursor", () => {
		expectTypeOf<CursorPage<{ id: string }>["items"]>().toEqualTypeOf<
			readonly { id: string }[]
		>();
		expectTypeOf<
			CursorPage<{ id: string }>["nextCursor"]
		>().toEqualTypeOf<OpaqueCursor | null>();

		const completePage = {
			items: [{ id: "company-1" }],
			nextCursor: null,
		} satisfies CursorPage<{ id: string }>;

		expect(completePage.nextCursor).toBeNull();
	});

	it("publishes CA-1.4 permissions and keeps semantic errors", () => {
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toEqual([
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
		]);
		expect(CORPORATE_ADMINISTRATION_ERROR_CODES).toHaveLength(21);
		expect(new Set(CORPORATE_ADMINISTRATION_ERROR_CODES).size).toBe(21);
	});

	it("creates versioned semantic event identities without registering events", () => {
		expect(
			createCorporateAdministrationEventType({
				aggregate: "test_entity",
				action: "created",
				version: 1,
			}),
		).toBe("corporate_administration.test_entity.created.v1");
		expect(
			createCorporateAdministrationEventType({
				aggregate: "test_child",
				action: "address_changed",
				version: 12,
			}),
		).toBe("corporate_administration.test_child.address_changed.v12");
	});

	it("validates event type syntax independently of the factory", () => {
		for (const value of [
			"corporate_administration.test_entity.created.v1",
			"corporate_administration.test_child.address_changed.v2",
		]) {
			expect(
				corporateAdministrationEventTypeSchema.safeParse(value).success,
			).toBe(true);
		}

		for (const value of [
			"corporate-administration.test_entity.created.v1",
			"corporate_administration.TestEntity.created.v1",
			"corporate_administration.test-entity.created.v1",
			"corporate_administration.1test_entity.created.v1",
			"corporate_administration._test_entity.created.v1",
			"corporate_administration.test__entity.created.v1",
			"corporate_administration.test_entity.create.v1",
			"corporate_administration.test_entity.Created.v1",
			"corporate_administration.test_entity._created.v1",
			"corporate_administration.test_entity.created.v0",
			"corporate_administration.test_entity.created.v01",
			"corporate_administration.test_entity.created.v9007199254740992",
		]) {
			expect(
				corporateAdministrationEventTypeSchema.safeParse(value).success,
			).toBe(false);
		}
	});

	it("rejects invalid event factory input", () => {
		for (const input of [
			{
				aggregate: "TestEntity",
				action: "created",
				version: 1,
			},
			{
				aggregate: "1test_entity",
				action: "created",
				version: 1,
			},
			{
				aggregate: "test_entity",
				action: "create",
				version: 1,
			},
			{
				aggregate: "test_entity",
				action: "created",
				version: 1.5,
			},
			{
				aggregate: "test_entity",
				action: "created",
				version: 0,
			},
			{
				aggregate: "test_entity",
				action: "created",
				version: Number.MAX_SAFE_INTEGER + 1,
			},
		]) {
			expect(() => createCorporateAdministrationEventType(input)).toThrow(
				RangeError,
			);
		}
	});
});
