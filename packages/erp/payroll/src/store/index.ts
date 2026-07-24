import type { PayrollAssignmentsStore } from "./assignments";
import type { PayrollInputsStore } from "./inputs";
import type { PayrollOutputsStore } from "./outputs";
import type { PayrollReconciliationStore } from "./reconciliation";
import type { PayrollRunsStore } from "./runs";
import type { PayrollSetupStore } from "./setup";
import type { PayrollStatutoryStore } from "./statutory";

export type PayrollStore = PayrollSetupStore &
	PayrollAssignmentsStore &
	PayrollInputsStore &
	PayrollRunsStore &
	PayrollStatutoryStore &
	PayrollOutputsStore &
	PayrollReconciliationStore;

export type { PayrollAssignmentsStore } from "./assignments";
export type { PayrollInputsStore } from "./inputs";
export type { PayrollOutputsStore } from "./outputs";
export type { PayrollReconciliationStore } from "./reconciliation";
export type { PayrollRunsStore } from "./runs";
export type { PayrollSetupStore } from "./setup";
export type { PayrollStatutoryStore } from "./statutory";
