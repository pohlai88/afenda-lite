export const CA_PERMISSION_COMPANY_CREATE =
	"corporate-administration.company.create" as const;
export const CA_PERMISSION_COMPANY_UPDATE =
	"corporate-administration.company.update" as const;
export const CA_PERMISSION_COMPANY_ACTIVATE =
	"corporate-administration.company.activate" as const;
export const CA_PERMISSION_COMPANY_SUSPEND =
	"corporate-administration.company.suspend" as const;
export const CA_PERMISSION_COMPANY_DISSOLVE =
	"corporate-administration.company.dissolve" as const;
export const CA_PERMISSION_COMPANY_ARCHIVE =
	"corporate-administration.company.archive" as const;
export const CA_PERMISSION_COMPANY_READ =
	"corporate-administration.company.read" as const;
export const CA_PERMISSION_COMPANY_LIST =
	"corporate-administration.company.list" as const;
export const CA_PERMISSION_COMPANY_NAME_MANAGE =
	"corporate-administration.company-name.manage" as const;
export const CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE =
	"corporate-administration.company-identifier.manage" as const;

export const CA_PERMISSION_GOVERNANCE_MANAGE =
	"corporate-administration.governance.manage" as const;
export const CA_PERMISSION_GOVERNANCE_READ =
	"corporate-administration.governance.read" as const;

export const CA_PERMISSION_SHARE_CAPITAL_MANAGE =
	"corporate-administration.share-capital.manage" as const;
export const CA_PERMISSION_SHARE_CAPITAL_READ =
	"corporate-administration.share-capital.read" as const;

export const CA_PERMISSION_PROPERTY_ASSETS_MANAGE =
	"corporate-administration.property-assets.manage" as const;
export const CA_PERMISSION_PROPERTY_ASSETS_READ =
	"corporate-administration.property-assets.read" as const;

export const CA_PERMISSION_LICENCES_BANKING_MANAGE =
	"corporate-administration.licences-banking.manage" as const;
export const CA_PERMISSION_LICENCES_BANKING_READ =
	"corporate-administration.licences-banking.read" as const;

export const CA_PERMISSION_DOCUMENTS_FILINGS_MANAGE =
	"corporate-administration.documents-filings.manage" as const;
export const CA_PERMISSION_DOCUMENTS_FILINGS_READ =
	"corporate-administration.documents-filings.read" as const;

export const CA_PERMISSION_COMPLIANCE_READ =
	"corporate-administration.compliance.read" as const;

export const CA_PERMISSION_CODES = [
	CA_PERMISSION_COMPANY_CREATE,
	CA_PERMISSION_COMPANY_UPDATE,
	CA_PERMISSION_COMPANY_ACTIVATE,
	CA_PERMISSION_COMPANY_SUSPEND,
	CA_PERMISSION_COMPANY_DISSOLVE,
	CA_PERMISSION_COMPANY_ARCHIVE,
	CA_PERMISSION_COMPANY_READ,
	CA_PERMISSION_COMPANY_LIST,
	CA_PERMISSION_COMPANY_NAME_MANAGE,
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	CA_PERMISSION_GOVERNANCE_MANAGE,
	CA_PERMISSION_GOVERNANCE_READ,
	CA_PERMISSION_SHARE_CAPITAL_MANAGE,
	CA_PERMISSION_SHARE_CAPITAL_READ,
	CA_PERMISSION_PROPERTY_ASSETS_MANAGE,
	CA_PERMISSION_PROPERTY_ASSETS_READ,
	CA_PERMISSION_LICENCES_BANKING_MANAGE,
	CA_PERMISSION_LICENCES_BANKING_READ,
	CA_PERMISSION_DOCUMENTS_FILINGS_MANAGE,
	CA_PERMISSION_DOCUMENTS_FILINGS_READ,
	CA_PERMISSION_COMPLIANCE_READ,
] as const;

export type CaPermission = (typeof CA_PERMISSION_CODES)[number];
