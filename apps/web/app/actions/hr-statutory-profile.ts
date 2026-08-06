"use server";

import type { Result as ActionResult } from "@afenda/errors";
import type {
	PriorEmployerYtd,
	StatutoryProfile,
	StatutoryProfileListPage,
} from "@afenda/human-resources";
import {
	getStatutoryProfile,
	getStatutoryProfileInputSchema,
	listPriorEmployerYtd,
	listPriorEmployerYtdInputSchema,
	listStatutoryProfiles,
	listStatutoryProfilesInputSchema,
	recordPriorEmployerYtd,
	recordPriorEmployerYtdInputSchema,
	upsertStatutoryProfile,
	upsertStatutoryProfileInputSchema,
} from "@afenda/human-resources";

import {
	invokeHrPackage,
	runHrComplianceHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/_runtime/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";

const upsertStatutoryProfileActionSchema = hrActionSchema(
	upsertStatutoryProfileInputSchema,
);
const getStatutoryProfileActionSchema = hrActionSchema(
	getStatutoryProfileInputSchema,
);
const listStatutoryProfilesActionSchema = hrActionSchema(
	listStatutoryProfilesInputSchema,
);
const recordPriorEmployerYtdActionSchema = hrActionSchema(
	recordPriorEmployerYtdInputSchema,
);
const listPriorEmployerYtdActionSchema = hrActionSchema(
	listPriorEmployerYtdInputSchema,
);

const SENSITIVE_IDENTIFIERS_MANAGE =
	"human-resources.sensitive-identifiers.manage" as const;
const SENSITIVE_IDENTIFIERS_READ =
	"human-resources.sensitive-identifiers.read" as const;

export async function upsertStatutoryProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: StatutoryProfile }>> {
	return await runHrHumanResourcesAction<
		StatutoryProfile,
		{ profile: StatutoryProfile }
	>({
		path: "upsertStatutoryProfileAction",
		permission: SENSITIVE_IDENTIFIERS_MANAGE,
		safeMessage: "Could not upsert the statutory profile.",
		validationMessage: "Enter a valid statutory profile.",
		actionSchema: upsertStatutoryProfileActionSchema,
		input,
		invoke: invokeHrPackage(upsertStatutoryProfile),
		mapData: (profile) => ({ profile }),
	});
}

export async function getStatutoryProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: StatutoryProfile | null }>> {
	return await runHrHumanResourcesAction<
		StatutoryProfile | null,
		{ profile: StatutoryProfile | null }
	>({
		path: "getStatutoryProfileAction",
		permission: SENSITIVE_IDENTIFIERS_READ,
		safeMessage: "Could not read the statutory profile.",
		validationMessage: "Enter a valid statutory profile lookup.",
		actionSchema: getStatutoryProfileActionSchema,
		input,
		invoke: invokeHrPackage(getStatutoryProfile),
		mapData: (profile) => ({ profile }),
	});
}

export async function listStatutoryProfilesAction(
	input: unknown,
): Promise<ActionResult<{ page: StatutoryProfileListPage }>> {
	return await runHrHumanResourcesAction<
		StatutoryProfileListPage,
		{ page: StatutoryProfileListPage }
	>({
		path: "listStatutoryProfilesAction",
		permission: SENSITIVE_IDENTIFIERS_READ,
		safeMessage: "Could not list statutory profiles.",
		validationMessage: "Enter valid statutory profile list filters.",
		actionSchema: listStatutoryProfilesActionSchema,
		input,
		invoke: invokeHrPackage(listStatutoryProfiles),
		mapData: (page) => ({ page }),
	});
}

export async function recordPriorEmployerYtdAction(
	input: unknown,
): Promise<ActionResult<{ priorEmployerYtd: PriorEmployerYtd }>> {
	return await runHrHumanResourcesAction<
		PriorEmployerYtd,
		{ priorEmployerYtd: PriorEmployerYtd }
	>({
		path: "recordPriorEmployerYtdAction",
		permission: SENSITIVE_IDENTIFIERS_MANAGE,
		safeMessage: "Could not record prior-employer YTD.",
		validationMessage: "Enter a valid prior-employer YTD record.",
		actionSchema: recordPriorEmployerYtdActionSchema,
		input,
		invoke: invokeHrPackage(recordPriorEmployerYtd),
		mapData: (priorEmployerYtd) => ({ priorEmployerYtd }),
	});
}

export async function listPriorEmployerYtdAction(
	input: unknown,
): Promise<ActionResult<{ rows: readonly PriorEmployerYtd[] }>> {
	return await runHrHumanResourcesAction<
		readonly PriorEmployerYtd[],
		{ rows: readonly PriorEmployerYtd[] }
	>({
		path: "listPriorEmployerYtdAction",
		permission: SENSITIVE_IDENTIFIERS_READ,
		safeMessage: "Could not list prior-employer YTD.",
		validationMessage: "Enter valid prior-employer YTD filters.",
		actionSchema: listPriorEmployerYtdActionSchema,
		input,
		invoke: invokeHrPackage(listPriorEmployerYtd),
		mapData: (rows) => ({ rows }),
	});
}
