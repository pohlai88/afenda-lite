import {
	type HrObservabilityArea,
	recordHrAuthorizationDenial,
} from "@afenda/human-resources";

import {
	type OperatorPermissionActionInput,
	runOperatorPermissionAction,
} from "@/app/actions/run-operator-permission-action";
import { createProductionHrObservabilityPorts } from "@/modules/platform/observability/human-resources-observability";

type HrOperatorPermissionActionInput<T> = Omit<
	OperatorPermissionActionInput<T>,
	"onPermissionDenied"
>;

export function createHrOperatorPermissionActionRunner(
	area: HrObservabilityArea,
) {
	return async function runHrOperatorPermissionAction<T>(
		input: HrOperatorPermissionActionInput<T>,
	) {
		return runOperatorPermissionAction({
			...input,
			onPermissionDenied: async () => {
				await recordHrAuthorizationDenial(
					{ area, reason: "permission_missing" },
					createProductionHrObservabilityPorts(),
				);
			},
		});
	};
}

export const runHrBulkOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("bulk");
export const runHrIntegrationOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("integration");
export const runHrLeaveOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("leave");
export const runHrPayrollDeliveryOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("payroll_delivery");
export const runHrPrivacyOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("privacy");
export const runHrTalentOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("talent");
export const runHrTimeOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("time");
export const runHrWorkforceOperatorPermissionAction =
	createHrOperatorPermissionActionRunner("workforce");
