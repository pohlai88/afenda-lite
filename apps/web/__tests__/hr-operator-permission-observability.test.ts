import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	createCorrelationId: vi.fn(),
	forbidUnlessPermission: vi.fn(),
	logProductEvent: vi.fn(),
	recordHrAuthorizationDenial: vi.fn(),
	createProductionHrObservabilityPorts: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@afenda/http", () => ({
	createCorrelationId: mocks.createCorrelationId,
}));
vi.mock("@afenda/human-resources", () => ({
	recordHrAuthorizationDenial: mocks.recordHrAuthorizationDenial,
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: mocks.forbidUnlessPermission,
}));
vi.mock("@/modules/platform/observability/product-log", () => ({
	logProductEvent: mocks.logProductEvent,
}));
vi.mock(
	"@/modules/platform/observability/human-resources-observability",
	() => ({
		createProductionHrObservabilityPorts:
			mocks.createProductionHrObservabilityPorts,
	}),
);

import { runHrPrivacyOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";

const session = {
	userId: "user-1",
	orgId: "org-1",
	role: "operator",
};
const denial = {
	ok: false as const,
	code: "FORBIDDEN",
	message: "Permission denied.",
};

describe("operator permission denial observability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireRole.mockResolvedValue(session);
		mocks.createCorrelationId.mockReturnValue("correlation-1");
		mocks.createProductionHrObservabilityPorts.mockReturnValue({
			recorder: {},
			clock: {},
		});
	});

	it("invokes the observer only for a permission-gate denial", async () => {
		const onPermissionDenied = vi.fn();
		const execute = vi.fn(async () => ({ ok: true as const, data: "ok" }));
		mocks.forbidUnlessPermission.mockResolvedValueOnce(denial);

		const denied = await runOperatorPermissionAction({
			path: "deniedAction",
			permission: "human-resources.privacy.export",
			safeMessage: "Could not run action.",
			onPermissionDenied,
			execute,
		});

		expect(denied).toEqual(denial);
		expect(onPermissionDenied).toHaveBeenCalledWith({
			session,
			correlationId: "correlation-1",
			permission: "human-resources.privacy.export",
		});
		expect(execute).not.toHaveBeenCalled();

		mocks.forbidUnlessPermission.mockResolvedValueOnce(null);
		await runOperatorPermissionAction({
			path: "allowedAction",
			permission: "human-resources.privacy.export",
			safeMessage: "Could not run action.",
			onPermissionDenied,
			execute,
		});
		expect(onPermissionDenied).toHaveBeenCalledTimes(1);
	});

	it("records a truthful HR area without changing the denial result", async () => {
		const ports = { recorder: {}, clock: {} };
		mocks.createProductionHrObservabilityPorts.mockReturnValue(ports);
		mocks.forbidUnlessPermission.mockResolvedValue(denial);

		const result = await runHrPrivacyOperatorPermissionAction({
			path: "privacyAction",
			permission: "human-resources.privacy.export",
			safeMessage: "Could not run privacy action.",
			execute: vi.fn(),
		});

		expect(result).toEqual(denial);
		expect(mocks.recordHrAuthorizationDenial).toHaveBeenCalledWith(
			{ area: "privacy", reason: "permission_missing" },
			ports,
		);
	});

	it("keeps the governed denial when the observer fails", async () => {
		mocks.forbidUnlessPermission.mockResolvedValue(denial);
		const result = await runOperatorPermissionAction({
			path: "deniedAction",
			permission: "human-resources.privacy.export",
			safeMessage: "Could not run action.",
			onPermissionDenied: () => {
				throw new Error("telemetry unavailable");
			},
			execute: vi.fn(),
		});

		expect(result).toEqual(denial);
		expect(mocks.logProductEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "action.permission_denial_observer_error",
				path: "deniedAction",
			}),
		);
	});
});
