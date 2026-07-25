export const CA_COMMAND_COMPANY_CREATE =
	"corporate-administration.company.create" as const;
export const CA_COMMAND_COMPANY_UPDATE =
	"corporate-administration.company.update" as const;
export const CA_COMMAND_COMPANY_ACTIVATE =
	"corporate-administration.company.activate" as const;
export const CA_COMMAND_COMPANY_SUSPEND =
	"corporate-administration.company.suspend" as const;
export const CA_COMMAND_COMPANY_DISSOLVE =
	"corporate-administration.company.dissolve" as const;
export const CA_COMMAND_COMPANY_ARCHIVE =
	"corporate-administration.company.archive" as const;
export const CA_COMMAND_COMPANY_NAME_ADD =
	"corporate-administration.company-name.add" as const;
export const CA_COMMAND_COMPANY_NAME_END =
	"corporate-administration.company-name.end" as const;
export const CA_COMMAND_COMPANY_IDENTIFIER_ADD =
	"corporate-administration.company-identifier.add" as const;
export const CA_COMMAND_COMPANY_IDENTIFIER_UPDATE =
	"corporate-administration.company-identifier.update" as const;
export const CA_COMMAND_COMPANY_IDENTIFIER_RETIRE =
	"corporate-administration.company-identifier.retire" as const;

export const CA_COMMAND_OFFICER_APPOINT =
	"corporate-administration.officer.appoint" as const;
export const CA_COMMAND_GOVERNANCE_BODY_CREATE =
	"corporate-administration.governance-body.create" as const;
export const CA_COMMAND_GOVERNANCE_MEMBERSHIP_APPOINT =
	"corporate-administration.governance-membership.appoint" as const;
export const CA_COMMAND_AUTHORITY_MANDATE_GRANT =
	"corporate-administration.authority-mandate.grant" as const;
export const CA_COMMAND_PREMISE_REGISTER =
	"corporate-administration.premise.register" as const;
export const CA_COMMAND_GOVERNANCE_MEETING_RECORD =
	"corporate-administration.governance-meeting.record" as const;
export const CA_COMMAND_RESOLUTION_RECORD =
	"corporate-administration.resolution.record" as const;

export const CA_COMMAND_SHARE_CLASS_CREATE =
	"corporate-administration.share-class.create" as const;
export const CA_COMMAND_SHARE_TRANSACTION_CREATE =
	"corporate-administration.share-transaction.create" as const;
export const CA_COMMAND_SHARE_CERTIFICATE_CREATE =
	"corporate-administration.share-certificate.create" as const;
export const CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_CREATE =
	"corporate-administration.beneficial-owner-disclosure.create" as const;

export const CA_COMMAND_PROPERTY_HOLDING_CREATE =
	"corporate-administration.property-holding.create" as const;
export const CA_COMMAND_CORPORATE_ASSET_CREATE =
	"corporate-administration.corporate-asset.create" as const;
export const CA_COMMAND_INTELLECTUAL_PROPERTY_RIGHT_CREATE =
	"corporate-administration.intellectual-property-right.create" as const;
export const CA_COMMAND_INSURANCE_POLICY_CREATE =
	"corporate-administration.insurance-policy.create" as const;
export const CA_COMMAND_CHARGE_CREATE =
	"corporate-administration.charge.create" as const;

export const CA_COMMAND_LICENCE_PERMIT_CREATE =
	"corporate-administration.licence-permit.create" as const;
export const CA_COMMAND_BANK_ACCOUNT_REGISTRATION_CREATE =
	"corporate-administration.bank-account-registration.create" as const;
export const CA_COMMAND_BANK_MANDATE_CREATE =
	"corporate-administration.bank-mandate.create" as const;
export const CA_COMMAND_GROUP_CONTROL_RELATIONSHIP_CREATE =
	"corporate-administration.group-control-relationship.create" as const;
export const CA_COMMAND_MATERIAL_AGREEMENT_CREATE =
	"corporate-administration.material-agreement.create" as const;

export const CA_COMMAND_CORPORATE_DOCUMENT_CREATE =
	"corporate-administration.corporate-document.create" as const;
export const CA_COMMAND_FILING_OBLIGATION_CREATE =
	"corporate-administration.filing-obligation.create" as const;
export const CA_COMMAND_FILING_SUBMISSION_CREATE =
	"corporate-administration.filing-submission.create" as const;

export const CA_COMMAND_IDS = [
	CA_COMMAND_COMPANY_CREATE,
	CA_COMMAND_COMPANY_UPDATE,
	CA_COMMAND_COMPANY_ACTIVATE,
	CA_COMMAND_COMPANY_SUSPEND,
	CA_COMMAND_COMPANY_DISSOLVE,
	CA_COMMAND_COMPANY_ARCHIVE,
	CA_COMMAND_COMPANY_NAME_ADD,
	CA_COMMAND_COMPANY_NAME_END,
	CA_COMMAND_COMPANY_IDENTIFIER_ADD,
	CA_COMMAND_COMPANY_IDENTIFIER_UPDATE,
	CA_COMMAND_COMPANY_IDENTIFIER_RETIRE,
	CA_COMMAND_OFFICER_APPOINT,
	CA_COMMAND_GOVERNANCE_BODY_CREATE,
	CA_COMMAND_GOVERNANCE_MEMBERSHIP_APPOINT,
	CA_COMMAND_AUTHORITY_MANDATE_GRANT,
	CA_COMMAND_PREMISE_REGISTER,
	CA_COMMAND_GOVERNANCE_MEETING_RECORD,
	CA_COMMAND_RESOLUTION_RECORD,
	CA_COMMAND_SHARE_CLASS_CREATE,
	CA_COMMAND_SHARE_TRANSACTION_CREATE,
	CA_COMMAND_SHARE_CERTIFICATE_CREATE,
	CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_CREATE,
	CA_COMMAND_PROPERTY_HOLDING_CREATE,
	CA_COMMAND_CORPORATE_ASSET_CREATE,
	CA_COMMAND_INTELLECTUAL_PROPERTY_RIGHT_CREATE,
	CA_COMMAND_INSURANCE_POLICY_CREATE,
	CA_COMMAND_CHARGE_CREATE,
	CA_COMMAND_LICENCE_PERMIT_CREATE,
	CA_COMMAND_BANK_ACCOUNT_REGISTRATION_CREATE,
	CA_COMMAND_BANK_MANDATE_CREATE,
	CA_COMMAND_GROUP_CONTROL_RELATIONSHIP_CREATE,
	CA_COMMAND_MATERIAL_AGREEMENT_CREATE,
	CA_COMMAND_CORPORATE_DOCUMENT_CREATE,
	CA_COMMAND_FILING_OBLIGATION_CREATE,
	CA_COMMAND_FILING_SUBMISSION_CREATE,
] as const;

export type CaCommandId = (typeof CA_COMMAND_IDS)[number];

export const CA_QUERY_COMPANY_GET =
	"corporate-administration.company.get" as const;
export const CA_QUERY_COMPANY_LIST =
	"corporate-administration.company.list" as const;
export const CA_QUERY_COMPANY_GET_AS_OF =
	"corporate-administration.company.get-as-of" as const;
export const CA_QUERY_COMPANY_NAME_LIST =
	"corporate-administration.company-name.list" as const;
export const CA_QUERY_COMPANY_IDENTIFIER_LIST =
	"corporate-administration.company-identifier.list" as const;
export const CA_QUERY_COMPANY_STATUS_LIST =
	"corporate-administration.company-status.list" as const;

export const CA_QUERY_OFFICER_GET =
	"corporate-administration.officer.get" as const;
export const CA_QUERY_OFFICER_LIST =
	"corporate-administration.officer.list" as const;
export const CA_QUERY_GOVERNANCE_BODY_GET =
	"corporate-administration.governance-body.get" as const;
export const CA_QUERY_GOVERNANCE_BODY_LIST =
	"corporate-administration.governance-body.list" as const;
export const CA_QUERY_GOVERNANCE_MEMBERSHIP_GET =
	"corporate-administration.governance-membership.get" as const;
export const CA_QUERY_GOVERNANCE_MEMBERSHIP_LIST =
	"corporate-administration.governance-membership.list" as const;
export const CA_QUERY_AUTHORITY_MANDATE_GET =
	"corporate-administration.authority-mandate.get" as const;
export const CA_QUERY_AUTHORITY_MANDATE_LIST =
	"corporate-administration.authority-mandate.list" as const;
export const CA_QUERY_PREMISE_GET =
	"corporate-administration.premise.get" as const;
export const CA_QUERY_PREMISE_LIST =
	"corporate-administration.premise.list" as const;
export const CA_QUERY_GOVERNANCE_MEETING_GET =
	"corporate-administration.governance-meeting.get" as const;
export const CA_QUERY_GOVERNANCE_MEETING_LIST =
	"corporate-administration.governance-meeting.list" as const;
export const CA_QUERY_RESOLUTION_GET =
	"corporate-administration.resolution.get" as const;
export const CA_QUERY_RESOLUTION_LIST =
	"corporate-administration.resolution.list" as const;

export const CA_QUERY_SHARE_CLASS_GET =
	"corporate-administration.share-class.get" as const;
export const CA_QUERY_SHARE_CLASS_LIST =
	"corporate-administration.share-class.list" as const;
export const CA_QUERY_SHARE_TRANSACTION_GET =
	"corporate-administration.share-transaction.get" as const;
export const CA_QUERY_SHARE_TRANSACTION_LIST =
	"corporate-administration.share-transaction.list" as const;
export const CA_QUERY_SHARE_CERTIFICATE_GET =
	"corporate-administration.share-certificate.get" as const;
export const CA_QUERY_SHARE_CERTIFICATE_LIST =
	"corporate-administration.share-certificate.list" as const;
export const CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_GET =
	"corporate-administration.beneficial-owner-disclosure.get" as const;
export const CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST =
	"corporate-administration.beneficial-owner-disclosure.list" as const;
export const CA_QUERY_SHARE_HOLDING_LIST_AS_OF =
	"corporate-administration.share-holding.list-as-of" as const;

export const CA_QUERY_PROPERTY_HOLDING_GET =
	"corporate-administration.property-holding.get" as const;
export const CA_QUERY_PROPERTY_HOLDING_LIST =
	"corporate-administration.property-holding.list" as const;
export const CA_QUERY_CORPORATE_ASSET_GET =
	"corporate-administration.corporate-asset.get" as const;
export const CA_QUERY_CORPORATE_ASSET_LIST =
	"corporate-administration.corporate-asset.list" as const;
export const CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_GET =
	"corporate-administration.intellectual-property-right.get" as const;
export const CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_LIST =
	"corporate-administration.intellectual-property-right.list" as const;
export const CA_QUERY_INSURANCE_POLICY_GET =
	"corporate-administration.insurance-policy.get" as const;
export const CA_QUERY_INSURANCE_POLICY_LIST =
	"corporate-administration.insurance-policy.list" as const;
export const CA_QUERY_CHARGE_GET =
	"corporate-administration.charge.get" as const;
export const CA_QUERY_CHARGE_LIST =
	"corporate-administration.charge.list" as const;

export const CA_QUERY_LICENCE_PERMIT_GET =
	"corporate-administration.licence-permit.get" as const;
export const CA_QUERY_LICENCE_PERMIT_LIST =
	"corporate-administration.licence-permit.list" as const;
export const CA_QUERY_BANK_ACCOUNT_REGISTRATION_GET =
	"corporate-administration.bank-account-registration.get" as const;
export const CA_QUERY_BANK_ACCOUNT_REGISTRATION_LIST =
	"corporate-administration.bank-account-registration.list" as const;
export const CA_QUERY_BANK_MANDATE_GET =
	"corporate-administration.bank-mandate.get" as const;
export const CA_QUERY_BANK_MANDATE_LIST =
	"corporate-administration.bank-mandate.list" as const;
export const CA_QUERY_GROUP_CONTROL_RELATIONSHIP_GET =
	"corporate-administration.group-control-relationship.get" as const;
export const CA_QUERY_GROUP_CONTROL_RELATIONSHIP_LIST =
	"corporate-administration.group-control-relationship.list" as const;
export const CA_QUERY_MATERIAL_AGREEMENT_GET =
	"corporate-administration.material-agreement.get" as const;
export const CA_QUERY_MATERIAL_AGREEMENT_LIST =
	"corporate-administration.material-agreement.list" as const;

export const CA_QUERY_CORPORATE_DOCUMENT_GET =
	"corporate-administration.corporate-document.get" as const;
export const CA_QUERY_CORPORATE_DOCUMENT_LIST =
	"corporate-administration.corporate-document.list" as const;
export const CA_QUERY_FILING_OBLIGATION_GET =
	"corporate-administration.filing-obligation.get" as const;
export const CA_QUERY_FILING_OBLIGATION_LIST =
	"corporate-administration.filing-obligation.list" as const;
export const CA_QUERY_FILING_SUBMISSION_GET =
	"corporate-administration.filing-submission.get" as const;
export const CA_QUERY_FILING_SUBMISSION_LIST =
	"corporate-administration.filing-submission.list" as const;

export const CA_QUERY_FILING_DUE_LIST =
	"corporate-administration.filing.due-list" as const;
export const CA_QUERY_FILING_OVERDUE_LIST =
	"corporate-administration.filing.overdue-list" as const;
export const CA_QUERY_CORPORATE_RECORDS_SEARCH =
	"corporate-administration.records.search" as const;

export const CA_QUERY_IDS = [
	CA_QUERY_COMPANY_GET,
	CA_QUERY_COMPANY_LIST,
	CA_QUERY_COMPANY_GET_AS_OF,
	CA_QUERY_COMPANY_NAME_LIST,
	CA_QUERY_COMPANY_IDENTIFIER_LIST,
	CA_QUERY_COMPANY_STATUS_LIST,
	CA_QUERY_OFFICER_GET,
	CA_QUERY_OFFICER_LIST,
	CA_QUERY_GOVERNANCE_BODY_GET,
	CA_QUERY_GOVERNANCE_BODY_LIST,
	CA_QUERY_GOVERNANCE_MEMBERSHIP_GET,
	CA_QUERY_GOVERNANCE_MEMBERSHIP_LIST,
	CA_QUERY_AUTHORITY_MANDATE_GET,
	CA_QUERY_AUTHORITY_MANDATE_LIST,
	CA_QUERY_PREMISE_GET,
	CA_QUERY_PREMISE_LIST,
	CA_QUERY_GOVERNANCE_MEETING_GET,
	CA_QUERY_GOVERNANCE_MEETING_LIST,
	CA_QUERY_RESOLUTION_GET,
	CA_QUERY_RESOLUTION_LIST,
	CA_QUERY_SHARE_CLASS_GET,
	CA_QUERY_SHARE_CLASS_LIST,
	CA_QUERY_SHARE_TRANSACTION_GET,
	CA_QUERY_SHARE_TRANSACTION_LIST,
	CA_QUERY_SHARE_CERTIFICATE_GET,
	CA_QUERY_SHARE_CERTIFICATE_LIST,
	CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_GET,
	CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST,
	CA_QUERY_SHARE_HOLDING_LIST_AS_OF,
	CA_QUERY_PROPERTY_HOLDING_GET,
	CA_QUERY_PROPERTY_HOLDING_LIST,
	CA_QUERY_CORPORATE_ASSET_GET,
	CA_QUERY_CORPORATE_ASSET_LIST,
	CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_GET,
	CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_LIST,
	CA_QUERY_INSURANCE_POLICY_GET,
	CA_QUERY_INSURANCE_POLICY_LIST,
	CA_QUERY_CHARGE_GET,
	CA_QUERY_CHARGE_LIST,
	CA_QUERY_LICENCE_PERMIT_GET,
	CA_QUERY_LICENCE_PERMIT_LIST,
	CA_QUERY_BANK_ACCOUNT_REGISTRATION_GET,
	CA_QUERY_BANK_ACCOUNT_REGISTRATION_LIST,
	CA_QUERY_BANK_MANDATE_GET,
	CA_QUERY_BANK_MANDATE_LIST,
	CA_QUERY_GROUP_CONTROL_RELATIONSHIP_GET,
	CA_QUERY_GROUP_CONTROL_RELATIONSHIP_LIST,
	CA_QUERY_MATERIAL_AGREEMENT_GET,
	CA_QUERY_MATERIAL_AGREEMENT_LIST,
	CA_QUERY_CORPORATE_DOCUMENT_GET,
	CA_QUERY_CORPORATE_DOCUMENT_LIST,
	CA_QUERY_FILING_OBLIGATION_GET,
	CA_QUERY_FILING_OBLIGATION_LIST,
	CA_QUERY_FILING_SUBMISSION_GET,
	CA_QUERY_FILING_SUBMISSION_LIST,
	CA_QUERY_FILING_DUE_LIST,
	CA_QUERY_FILING_OVERDUE_LIST,
	CA_QUERY_CORPORATE_RECORDS_SEARCH,
] as const;

export type CaQueryId = (typeof CA_QUERY_IDS)[number];
