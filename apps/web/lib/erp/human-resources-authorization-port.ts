import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
	HumanResourcesAuthorizationDecisionInput,
} from "@afenda/human-resources/authorization";
import { hasPermission } from "@/modules/identity/domain/has-permission";
import { ok, type Result } from "@afenda/errors/result";

export function createHumanResourcesAuthorizationPort(): HumanResourcesAuthorizationPort {
	return {
		async can(input) {
			return hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: input.permission,
			});
		},
	};
}

export function createHumanResourcesResourceAwareAuthorizationPort(): HumanResourcesResourceAwareAuthorizationPort {
	return {
		async canWithContext(input: HumanResourcesAuthorizationDecisionInput): Promise<
			Result<{
				allowed: boolean;
				projectedFields?: string[];
				reason?: string;
			}>
		> {
			const basicPermission = await hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: input.permission,
			});

			if (!basicPermission) {
				return ok({
					allowed: false,
					reason: `Missing required permission: ${input.permission}`,
				});
			}

			let projectedFields: string[] | undefined;

			if (
				input.sensitivity === "highly_restricted" ||
				input.sensitivity === "sensitive"
			) {
				const sensitivePermissionCode = getSensitivePermissionCode(
					input.permission,
				);
				if (sensitivePermissionCode) {
					const hasSensitivePermission = await hasPermission({
						orgId: input.organizationId,
						userId: input.actorUserId,
						code: sensitivePermissionCode,
					});

					if (!hasSensitivePermission) {
						projectedFields = getRedactedFields(
							input.resourceType,
							input.sensitivity,
						);
						return ok({
							allowed: true,
							projectedFields,
							reason:
								input.sensitivity === "highly_restricted"
									? "Highly restricted fields redacted - missing sensitive permission"
									: "Sensitive fields redacted - missing sensitive permission",
						});
					}
				}
			}

			return ok({
				allowed: true,
				projectedFields,
				reason: "Full access granted",
			});
		},
	};
}

function getSensitivePermissionCode(basePermission: string): string | null {
	if (basePermission.includes("performance")) {
		return "human-resources.performance.confidential.read";
	}
	if (basePermission.includes("leave")) {
		return "human-resources.leave-request.sensitive-read";
	}
	if (basePermission.includes("employee-document")) {
		return "human-resources.identity-document.sensitive.read";
	}
	if (basePermission.includes("compensation")) {
		return "human-resources.compensation.read";
	}
	if (basePermission.includes("employee-case")) {
		return "human-resources.employee-case.investigate";
	}
	return null;
}

function getRedactedFields(
	resourceType: string | undefined,
	sensitivity: "sensitive" | "highly_restricted",
): string[] {
	if (resourceType === "performance") {
		return ["commentsSensitive", "rating", "overallRating"];
	}
	if (resourceType === "leave") {
		return ["note", "rejectionNote", "medicalDetails"];
	}
	if (resourceType === "compensation" && sensitivity === "highly_restricted") {
		return ["baseAmount", "currencyCode", "effectiveFrom", "bands"];
	}
	if (resourceType === "employee-document") {
		return ["identifierLast4", "identifierFingerprint", "documentRef"];
	}
	if (resourceType === "employee-case") {
		return ["witnessStatements", "evidence", "investigations"];
	}
	return [];
}
