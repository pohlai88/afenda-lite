import type { CorporateAdministrationCommandOptions } from "../../src/command-options";
import { createLegalCompany } from "../../src/legal-company";
import type {
	ActivateLegalCompanyInput,
	AddCompanyIdentifierInput,
	AddCompanyNameInput,
	ArchiveLegalCompanyInput,
	CaLegalCompany,
	CreateLegalCompanyInput,
	DissolveLegalCompanyInput,
	GetLegalCompanyAsOfInput,
	SuspendLegalCompanyInput,
	UpdateLegalCompanyInput,
} from "../../src/schemas";

export const CA_TEST_ORG_A = "org-a";
export const CA_TEST_DIM_A = "10000000-0000-4000-8000-000000000001";
export const CA_TEST_PARTY_A = "20000000-0000-4000-8000-000000000001";

export function caEffectiveAtFromDate(isoDate: string): string {
	return `${isoDate}T00:00:00.000Z`;
}

type MutationContextOverrides = Partial<{
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	causationId: string | null;
	idempotencyKey: string;
}>;

export function caMutationContext(
	tag: string,
	overrides: MutationContextOverrides = {},
) {
	return {
		organizationId: CA_TEST_ORG_A,
		actorUserId: "user-1",
		correlationId: `corr-${tag}`,
		idempotencyKey: tag.length >= 8 ? tag : `idem-${tag}`,
		...overrides,
	};
}

export function createLegalCompanyTestInput(
	tag: string,
	overrides: Partial<CreateLegalCompanyInput> = {},
): CreateLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		code: `CO-${tag}`.slice(0, 100),
		legalEntityDimensionId: CA_TEST_DIM_A,
		...overrides,
	};
}

export function addCompanyNameTestInput(
	tag: string,
	legalCompanyId: AddCompanyNameInput["legalCompanyId"],
	overrides: Partial<AddCompanyNameInput> = {},
): AddCompanyNameInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId,
		nameType: "legal",
		displayName: "Test Legal Name Sdn Bhd",
		effectiveFrom: "2024-01-01",
		...overrides,
	};
}

export function addCompanyIdentifierTestInput(
	tag: string,
	legalCompanyId: AddCompanyIdentifierInput["legalCompanyId"],
	overrides: Partial<AddCompanyIdentifierInput> = {},
): AddCompanyIdentifierInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId,
		identifierType: "company_registration",
		identifierValue: "REG-TEST-1",
		effectiveFrom: "2024-01-01",
		...overrides,
	};
}

export function activateLegalCompanyTestInput(
	tag: string,
	company: { id: ActivateLegalCompanyInput["legalCompanyId"]; version: number },
	effectiveDate = "2024-01-01",
	overrides: Partial<ActivateLegalCompanyInput> = {},
): ActivateLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId: company.id,
		expectedVersion: company.version,
		effectiveAt: caEffectiveAtFromDate(effectiveDate),
		...overrides,
	};
}

export function suspendLegalCompanyTestInput(
	tag: string,
	company: { id: SuspendLegalCompanyInput["legalCompanyId"]; version: number },
	overrides: Partial<SuspendLegalCompanyInput> = {},
): SuspendLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId: company.id,
		expectedVersion: company.version,
		effectiveAt: caEffectiveAtFromDate("2024-06-01"),
		reasonCode: "test_suspend",
		reason: "Test suspension",
		...overrides,
	};
}

export function dissolveLegalCompanyTestInput(
	tag: string,
	company: { id: DissolveLegalCompanyInput["legalCompanyId"]; version: number },
	overrides: Partial<DissolveLegalCompanyInput> = {},
): DissolveLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId: company.id,
		expectedVersion: company.version,
		effectiveAt: caEffectiveAtFromDate("2024-06-01"),
		reasonCode: "test_dissolve",
		reason: "Test dissolution",
		evidenceDocumentReference: "DOC-TEST-1",
		...overrides,
	};
}

export function archiveLegalCompanyTestInput(
	tag: string,
	company: { id: ArchiveLegalCompanyInput["legalCompanyId"]; version: number },
	overrides: Partial<ArchiveLegalCompanyInput> = {},
): ArchiveLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId: company.id,
		expectedVersion: company.version,
		effectiveAt: caEffectiveAtFromDate("2024-06-01"),
		reasonCode: "test_archive",
		reason: "Test archive",
		...overrides,
	};
}

export function updateLegalCompanyTestInput(
	tag: string,
	company: { id: UpdateLegalCompanyInput["legalCompanyId"]; version: number },
	overrides: Partial<UpdateLegalCompanyInput> = {},
): UpdateLegalCompanyInput {
	return {
		...caMutationContext(tag, overrides),
		legalCompanyId: company.id,
		expectedVersion: company.version,
		...overrides,
	};
}

export function getLegalCompanyAsOfTestInput(
	legalCompanyId: GetLegalCompanyAsOfInput["legalCompanyId"],
	asOfDate: string,
	overrides: Partial<GetLegalCompanyAsOfInput> = {},
): GetLegalCompanyAsOfInput {
	return {
		organizationId: CA_TEST_ORG_A,
		actorUserId: "user-1",
		legalCompanyId,
		asOf: caEffectiveAtFromDate(asOfDate),
		...overrides,
	};
}

export async function seedLegalCompanyForTests(
	deps: CorporateAdministrationCommandOptions,
	tag: string,
	overrides: Partial<CreateLegalCompanyInput> = {},
): Promise<CaLegalCompany> {
	const result = await createLegalCompany(
		createLegalCompanyTestInput(tag, overrides),
		deps,
	);
	if (!result.ok) {
		throw new Error(
			`seedLegalCompanyForTests(${tag}) failed: ${result.code}`,
		);
	}
	return result.data;
}
