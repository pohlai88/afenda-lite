import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createItem } from "../src/capabilities/core-organization-masters/item";
import { createItemGroup } from "../src/capabilities/core-organization-masters/item-group";
import type {
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "../src/capabilities/platform-references";
import * as platformReferences from "../src/capabilities/platform-references";
import {
	countryCodeSchema,
	currencyCodeSchema,
	languageCodeSchema,
	MemoryPlatformReferenceStore,
	readRefCurrencies,
	readRefCurrencyByCode,
	readRefUomDimensions,
	readRefUomsByDimension,
	refCountryIdSchema,
	refCurrencyIdSchema,
	refLanguageIdSchema,
	refTimeZoneIdSchema,
	refUomDimensionIdSchema,
	refUomIdSchema,
	resolveActiveUom,
	timeZoneCodeSchema,
	uomCodeSchema,
	uomConversionDirection,
	uomDimensionCodeSchema,
	validateItemUomCompatibility,
} from "../src/capabilities/platform-references";
import * as masterDataRoot from "../src/index";
import { createMasterDataTestHarness } from "./helpers/harness";

const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");
const kilogramId = "b1000000-0000-4000-8000-000000000004";
const gramId = "b1000000-0000-4000-8000-000000000008";
const inactiveEachId = "b1000000-0000-4000-8000-000000009999";
const massDimensionId = "a1000000-0000-4000-8000-000000000003";
const countDimensionId = "a1000000-0000-4000-8000-000000000001";
const malaysiaCountryId = "c1000000-0000-4000-8000-000000000001";
const inactiveCountryId = "c1000000-0000-4000-8000-000000000099";
const englishLanguageId = "e1000000-0000-4000-8000-000000000001";
const kualaLumpurTimeZoneId = "f1000000-0000-4000-8000-000000000001";
const prohibitedReferenceMutationExports = [
	"createCountry",
	"createCurrency",
	"createLanguage",
	"createTimeZone",
	"createUom",
	"createUomDimension",
	"updateCountry",
	"updateCurrency",
	"updateLanguage",
	"updateTimeZone",
	"updateUom",
	"updateUomDimension",
	"upsertCountry",
	"upsertCurrency",
	"upsertLanguage",
	"upsertTimeZone",
	"upsertUom",
	"upsertUomDimension",
	"activateCountry",
	"activateCurrency",
	"activateLanguage",
	"activateTimeZone",
	"activateUom",
	"activateUomDimension",
	"deactivateCountry",
	"deactivateCurrency",
	"deactivateLanguage",
	"deactivateTimeZone",
	"deactivateUom",
	"deactivateUomDimension",
	"retireCountry",
	"retireCurrency",
	"retireLanguage",
	"retireTimeZone",
	"retireUom",
	"retireUomDimension",
] as const;

function currency(input: {
	id: string;
	code: string;
	name: string;
	active: boolean;
}): RefCurrency {
	return {
		id: refCurrencyIdSchema.parse(input.id),
		code: currencyCodeSchema.parse(input.code),
		name: input.name,
		minorUnits: 2,
		active: input.active,
	};
}

function country(input: {
	id: string;
	code: string;
	alpha3: string;
	name: string;
	active: boolean;
}): RefCountry {
	return {
		id: refCountryIdSchema.parse(input.id),
		code: countryCodeSchema.parse(input.code),
		alpha3: input.alpha3,
		name: input.name,
		active: input.active,
	};
}

function language(input: {
	id: string;
	code: string;
	name: string;
	active: boolean;
}): RefLanguage {
	return {
		id: refLanguageIdSchema.parse(input.id),
		code: languageCodeSchema.parse(input.code),
		name: input.name,
		active: input.active,
	};
}

function timeZone(input: {
	id: string;
	ianaName: string;
	name: string;
	active: boolean;
}): RefTimeZone {
	return {
		id: refTimeZoneIdSchema.parse(input.id),
		ianaName: timeZoneCodeSchema.parse(input.ianaName),
		name: input.name,
		active: input.active,
	};
}

function dimension(input: {
	id: string;
	code: string;
	name: string;
}): RefUomDimension {
	return {
		id: refUomDimensionIdSchema.parse(input.id),
		code: uomDimensionCodeSchema.parse(input.code),
		name: input.name,
	};
}

function uom(input: {
	id: string;
	dimensionId: string;
	code: string;
	name: string;
	active: boolean;
}): RefUom {
	return {
		id: refUomIdSchema.parse(input.id),
		dimensionId: refUomDimensionIdSchema.parse(input.dimensionId),
		code: uomCodeSchema.parse(input.code),
		name: input.name,
		symbol: input.code,
		toBaseNumerator: "1",
		toBaseDenominator: "1",
		isBase: true,
		active: input.active,
	};
}

function createReferenceStore(): MemoryPlatformReferenceStore {
	return new MemoryPlatformReferenceStore({
		countries: [
			country({
				id: malaysiaCountryId,
				code: "MY",
				alpha3: "MYS",
				name: "Malaysia",
				active: true,
			}),
			country({
				id: inactiveCountryId,
				code: "ZZ",
				alpha3: "ZZZ",
				name: "Inactive Country",
				active: false,
			}),
		],
		currencies: [
			currency({
				id: "d1000000-0000-4000-8000-000000000001",
				code: "MYR",
				name: "Malaysian Ringgit",
				active: true,
			}),
			currency({
				id: "d1000000-0000-4000-8000-000000000002",
				code: "SGD",
				name: "Singapore Dollar",
				active: false,
			}),
			currency({
				id: "d1000000-0000-4000-8000-000000000003",
				code: "USD",
				name: "US Dollar",
				active: true,
			}),
		],
		languages: [
			language({
				id: englishLanguageId,
				code: "en",
				name: "English",
				active: true,
			}),
		],
		timeZones: [
			timeZone({
				id: kualaLumpurTimeZoneId,
				ianaName: "Asia/Kuala_Lumpur",
				name: "Kuala Lumpur",
				active: true,
			}),
		],
		uomDimensions: [
			dimension({
				id: countDimensionId,
				code: "count",
				name: "Count",
			}),
			dimension({
				id: massDimensionId,
				code: "mass",
				name: "Mass",
			}),
		],
		uoms: [
			uom({
				id: kilogramId,
				dimensionId: massDimensionId,
				code: "KG",
				name: "Kilogram",
				active: true,
			}),
			uom({
				id: gramId,
				dimensionId: massDimensionId,
				code: "G",
				name: "Gram",
				active: true,
			}),
			uom({
				id: inactiveEachId,
				dimensionId: countDimensionId,
				code: "EA",
				name: "Each",
				active: false,
			}),
		],
	});
}

describe("@afenda/master-data platform references", () => {
	it("normalizes codes by reference family", () => {
		expect(countryCodeSchema.parse(" my ")).toBe("MY");
		expect(currencyCodeSchema.parse(" myr ")).toBe("MYR");
		expect(languageCodeSchema.parse("ZH-hans")).toBe("zh-Hans");
		expect(timeZoneCodeSchema.parse(" Asia/Kuala_Lumpur ")).toBe(
			"Asia/Kuala_Lumpur",
		);
		expect(uomDimensionCodeSchema.parse(" Mass ")).toBe("mass");
		expect(uomCodeSchema.parse(" kg ")).toBe("KG");
	});

	it("keeps lookup separate from active-reference validation", async () => {
		const store = createReferenceStore();
		const historical = await readRefCurrencyByCode(store, { code: "sgd" });
		expect(historical.ok).toBe(true);
		if (historical.ok) {
			expect(historical.data.active).toBe(false);
		}

		const activeOnly = await resolveActiveUom(
			store,
			refUomIdSchema.parse(inactiveEachId),
		);
		expect(activeOnly.ok).toBe(false);
		if (!activeOnly.ok) {
			expect(activeOnly.details).toMatchObject({
				reason: "MASTER_INVALID_STATE",
				platformReferenceReason: "MASTER_DATA_REFERENCE_INACTIVE",
			});
		}
	});

	it("lists active rows by default and includes inactive rows explicitly", async () => {
		const store = createReferenceStore();
		const defaultList = await readRefCurrencies(store, {});
		expect(defaultList.ok).toBe(true);
		if (defaultList.ok) {
			expect(defaultList.data.items.map((row) => row.code)).toEqual([
				"MYR",
				"USD",
			]);
		}

		const allRows = await readRefCurrencies(store, { status: "all" });
		expect(allRows.ok).toBe(true);
		if (allRows.ok) {
			expect(allRows.data.items.map((row) => row.code)).toEqual([
				"MYR",
				"SGD",
				"USD",
			]);
		}
	});

	it("exposes MD-1.1 get/list platform reference queries without organization scope", async () => {
		const store = createReferenceStore();

		await expect(
			platformReferences.getRefCountry(store, { id: malaysiaCountryId }),
		).resolves.toMatchObject({ ok: true, data: { code: "MY" } });
		await expect(
			platformReferences.listRefCountries(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ code: "MY" }] },
		});
		await expect(
			platformReferences.getRefCurrency(store, {
				id: "d1000000-0000-4000-8000-000000000001",
			}),
		).resolves.toMatchObject({ ok: true, data: { code: "MYR" } });
		await expect(
			platformReferences.listRefCurrencies(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ code: "MYR" }, { code: "USD" }] },
		});
		await expect(
			platformReferences.getRefLanguage(store, { id: englishLanguageId }),
		).resolves.toMatchObject({ ok: true, data: { code: "en" } });
		await expect(
			platformReferences.listRefLanguages(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ code: "en" }] },
		});
		await expect(
			platformReferences.getRefTimeZone(store, { id: kualaLumpurTimeZoneId }),
		).resolves.toMatchObject({
			ok: true,
			data: { ianaName: "Asia/Kuala_Lumpur" },
		});
		await expect(
			platformReferences.listRefTimeZones(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ ianaName: "Asia/Kuala_Lumpur" }] },
		});
		await expect(
			platformReferences.getRefUomDimension(store, { id: massDimensionId }),
		).resolves.toMatchObject({ ok: true, data: { code: "mass" } });
		await expect(
			platformReferences.listRefUomDimensions(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ code: "count" }, { code: "mass" }] },
		});
		await expect(
			platformReferences.getRefUom(store, { id: kilogramId }),
		).resolves.toMatchObject({ ok: true, data: { code: "KG" } });
		await expect(
			platformReferences.listRefUoms(store, {}),
		).resolves.toMatchObject({
			ok: true,
			data: { items: [{ code: "G" }, { code: "KG" }] },
		});
	});

	it("filters UoMs by dimension with deterministic active default", async () => {
		const store = createReferenceStore();
		const result = await readRefUomsByDimension(store, {
			dimensionId: refUomDimensionIdSchema.parse(massDimensionId),
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.items.map((row) => row.code)).toEqual(["G", "KG"]);
		}
	});

	it("rejects status filters for UoM dimensions because dimensions have no active state", async () => {
		const store = createReferenceStore();
		const result = await readRefUomDimensions(store, { status: "inactive" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.details).toMatchObject({
				reason: "MASTER_VALIDATION_FAILED",
				platformReferenceReason: "MASTER_DATA_REFERENCE_INVALID",
				referenceFamily: "uom_dimension",
			});
		}
	});

	it("documents and enforces UoM compatibility policy", async () => {
		const store = createReferenceStore();
		const kilogram = await resolveActiveUom(
			store,
			refUomIdSchema.parse(kilogramId),
		);
		const gram = await resolveActiveUom(store, refUomIdSchema.parse(gramId));
		expect(kilogram.ok && gram.ok).toBe(true);
		if (!kilogram.ok || !gram.ok) return;

		const sameDimension = validateItemUomCompatibility({
			baseUom: kilogram.data,
			alternateUom: gram.data,
			policy: "strict_dimension",
		});
		expect(sameDimension).toEqual({
			ok: true,
			data: { direction: uomConversionDirection },
		});

		const crossDimension = validateItemUomCompatibility({
			baseUom: kilogram.data,
			alternateUom: {
				id: refUomIdSchema.parse(inactiveEachId),
				dimensionId: refUomDimensionIdSchema.parse(countDimensionId),
				code: uomCodeSchema.parse("EA"),
				name: "Each",
				symbol: "EA",
				toBaseNumerator: "1",
				toBaseDenominator: "1",
				isBase: true,
				active: true,
			},
			policy: "strict_dimension",
		});
		expect(crossDimension.ok).toBe(false);
	});

	it("rejects inactive UoMs for new item mutations", async () => {
		const { store, options } = createMasterDataTestHarness();
		store.seedRefs({
			uoms: [
				{
					id: inactiveEachId,
					code: "EA",
					name: "Each",
					symbol: "ea",
					dimensionId: countDimensionId,
					toBaseNumerator: "1",
					toBaseDenominator: "1",
					isBase: true,
					active: false,
				},
			],
		});

		const group = await createItemGroup(
			{
				organizationId: "org-platform-ref",
				actorUserId: "user-platform-ref",
				correlationId: "corr-platform-ref",
				code: "RAW",
				name: "Raw Materials",
			},
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;

		const item = await createItem(
			{
				organizationId: "org-platform-ref",
				actorUserId: "user-platform-ref",
				correlationId: "corr-platform-ref",
				code: "ITEM-INACTIVE-UOM",
				name: "Inactive UoM Item",
				itemType: "stock",
				baseUomId: refUomIdSchema.parse(inactiveEachId),
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(false);
		if (!item.ok) {
			expect(item.message).toContain("active platform UoM");
		}
	});

	it("keeps package export boundaries free of reference mutation APIs", () => {
		expect(masterDataRoot).toMatchObject({
			getRefCountryByCode: expect.any(Function),
			getRefCurrencyByCode: expect.any(Function),
			getRefLanguageByCode: expect.any(Function),
			getRefTimeZoneByIana: expect.any(Function),
			getRefUomByCode: expect.any(Function),
			getRefUomById: expect.any(Function),
			getRefUomDimensionByCode: expect.any(Function),
			listRefUoms: expect.any(Function),
		});
		expect(masterDataRoot).not.toHaveProperty("DrizzlePlatformReferenceStore");
		expect(masterDataRoot).not.toHaveProperty("MemoryPlatformReferenceStore");
		for (const exportName of prohibitedReferenceMutationExports) {
			expect(masterDataRoot).not.toHaveProperty(exportName);
			expect(platformReferences).not.toHaveProperty(exportName);
		}

		const packageJson = readFileSync(
			join(repoRoot, "packages/erp/master-data/package.json"),
			"utf8",
		);
		const packageConfig = JSON.parse(packageJson) as {
			exports: Record<string, unknown>;
		};
		expect(packageConfig.exports).toHaveProperty("./platform-references");

		const capabilityIndexSource = readFileSync(
			join(
				repoRoot,
				"packages/erp/master-data/src/capabilities/platform-references/index.ts",
			),
			"utf8",
		);
		expect(capabilityIndexSource).not.toMatch(
			/createCurrency|updateCountry|upsertUom|deactivateLanguage|refCountryTable|refCurrencyTable|refUomTable/,
		);

		const dbSchemaSource = readFileSync(
			join(repoRoot, "packages/data-plane/db/src/schema/master-data.ts"),
			"utf8",
		);
		expect(dbSchemaSource).toContain('uniqueIndex("ref_country_code_uidx")');
		expect(dbSchemaSource).toContain('uniqueIndex("ref_currency_code_uidx")');
		expect(dbSchemaSource).toContain(
			'uniqueIndex("ref_uom_dimension_code_uidx")',
		);
		expect(dbSchemaSource).toContain('uniqueIndex("ref_uom_code_uidx")');
		expect(dbSchemaSource).toContain("references(() => refUomDimension.id)");
		expect(dbSchemaSource).not.toMatch(/pgTable\(\s*["']md_uom["']/i);
	});

	it("does not retain unused platform-reference helper replicas", () => {
		expect(
			readFileSync(
				join(
					repoRoot,
					"packages/erp/master-data/src/capabilities/platform-references/index.ts",
				),
				"utf8",
			),
		).not.toContain("uom-factor");
		expect(() =>
			readFileSync(
				join(
					repoRoot,
					"packages/erp/master-data/src/capabilities/platform-references/uom-factor.ts",
				),
				"utf8",
			),
		).toThrow();
	});
});
