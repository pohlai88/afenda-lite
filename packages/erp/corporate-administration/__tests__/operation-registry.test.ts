import {
	corporateAdministrationModuleManifest,
	corporateAdministrationPermissionFor,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import { CORPORATE_ADMINISTRATION_PERMISSION_CODES } from "../src/kernel/authorization/permissions";
import { CORPORATE_ADMINISTRATION_EVENT_TYPES } from "../src/kernel/emissions/event-types";
import {
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_OPERATION_REGISTRY,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	getCorporateAdministrationOperationDefinition,
} from "../src/kernel/operations/registry";

describe("Corporate Administration operation registry", () => {
	it("is the singular source for every command and query projection", () => {
		expect(CORPORATE_ADMINISTRATION_OPERATION_REGISTRY).toHaveLength(102);
		expect(CORPORATE_ADMINISTRATION_COMMAND_IDS).toHaveLength(65);
		expect(CORPORATE_ADMINISTRATION_QUERY_IDS).toHaveLength(37);
		expect(
			new Set(
				CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.map(
					(definition) => definition.id,
				),
			),
		).toHaveLength(102);

		expect(corporateAdministrationModuleManifest.owns.commands).toEqual(
			CORPORATE_ADMINISTRATION_COMMAND_IDS,
		);
		expect(corporateAdministrationModuleManifest.owns.queries).toEqual(
			CORPORATE_ADMINISTRATION_QUERY_IDS,
		);
		expect(
			corporateAdministrationModuleManifest.authorization.commands,
		).toEqual(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS);
		expect(corporateAdministrationModuleManifest.authorization.queries).toEqual(
			CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
		);
	});

	it("owns authorization, durability, event, privacy, and observability policy", () => {
		const commands = CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.filter(
			(definition) => definition.kind === "command",
		);
		const queries = CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.filter(
			(definition) => definition.kind === "query",
		);

		expect(
			new Set(commands.map((definition) => definition.commandIdentity)),
		).toHaveLength(commands.length);
		expect(new Set(commands.map((definition) => definition.eventType))).toEqual(
			new Set(CORPORATE_ADMINISTRATION_EVENT_TYPES),
		);
		expect(
			new Set(
				CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.map(
					(definition) => definition.permission,
				),
			),
		).toEqual(new Set(CORPORATE_ADMINISTRATION_PERMISSION_CODES));

		for (const definition of commands) {
			expect(definition.transaction).toBe("required");
			expect(definition.idempotency).toBe("required");
			expect(definition.emission).toBe("required");
			expect(definition.eventType).toMatch(
				/^corporate_administration\.[a-z0-9_]+\.[a-z0-9_]+\.v1$/,
			);
			expect(definition.authorizationPolicy).toBe(
				definition.approvalPolicy === "none"
					? "tenant_permission"
					: "tenant_permission_and_approval",
			);
			expect(definition.privacyPolicy).toBe("redacted_domain_event");
			expect(definition.observabilityClass).toBe(
				"corporate_administration_operation",
			);
		}
		expect(
			commands.filter(
				(definition) =>
					definition.approvalPolicy === "maker_checker_when_configured",
			),
		).toHaveLength(11);
		expect(
			commands.filter(
				(definition) => definition.approvalPolicy === "maker_checker_required",
			),
		).toHaveLength(7);
		expect(
			commands.filter(
				(definition) =>
					definition.approvalPolicy === "maker_checker_for_protected_role",
			),
		).toHaveLength(1);
		expect(
			getCorporateAdministrationOperationDefinition("activateLegalCompany")
				.approvalPolicy,
		).toBe("maker_checker_required");
		expect(
			getCorporateAdministrationOperationDefinition("appointOfficer")
				.approvalPolicy,
		).toBe("maker_checker_for_protected_role");
		for (const definition of queries) {
			expect(definition.transaction).toBe("none");
			expect(definition.idempotency).toBe("none");
			expect(definition.emission).toBe("none");
			expect(definition.approvalPolicy).toBe("none");
			expect(definition.authorizationPolicy).toBe("tenant_permission");
			expect(definition.privacyPolicy).toBe("tenant_scoped_read");
		}
	});

	it("registers retirement and activity-end events as durable command semantics", () => {
		expect(
			getCorporateAdministrationOperationDefinition("retireCompanyName")
				.eventType,
		).toBe("corporate_administration.legal_company.name_retired.v1");
		expect(
			getCorporateAdministrationOperationDefinition("retireCompanyIdentifier")
				.eventType,
		).toBe("corporate_administration.legal_company.identifier_retired.v1");
		expect(
			getCorporateAdministrationOperationDefinition("endCompanyActivity")
				.eventType,
		).toBe("corporate_administration.legal_company.activity_ended.v1");
	});

	it("projects permission decisions through a capability instead of public maps", () => {
		expect(corporateAdministrationPermissionFor("retireCompanyName")).toBe(
			"corporate_administration.company.manage",
		);
		expect(corporateAdministrationPermissionFor("listResolutionsAsOf")).toBe(
			"corporate_administration.resolution.read",
		);
	});
});
