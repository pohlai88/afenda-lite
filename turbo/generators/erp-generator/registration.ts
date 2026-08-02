import { generatorContracts } from "../contracts.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { createErpLayoutAuthorityDoctorExtension } from "./layout-authority.ts";
import { createErpManifestAuthorityDoctorExtension } from "./manifest-authority.ts";
import { createErpProjectionLockAuthorityDoctorExtension } from "./projection-lock-authority.ts";
import {
	createErpTreatmentPlan,
	renderErpTreatmentPlanTextLines,
} from "./treatment-authority.ts";

const createErpDoctorExtension: NonNullable<
	Parameters<typeof createFamilyRegistration>[2]
>["createDoctorExtension"] = async (input) => {
	const [manifest, layout, projectionLock] = await Promise.all([
		createErpManifestAuthorityDoctorExtension(input),
		createErpLayoutAuthorityDoctorExtension(input),
		createErpProjectionLockAuthorityDoctorExtension(input),
	]);
	const diagnostics = Object.freeze([
		...manifest.diagnostics,
		...layout.diagnostics,
		...projectionLock.diagnostics,
	]);
	const treatmentPlan = createErpTreatmentPlan({ diagnostics });
	const treatmentTextLines = renderErpTreatmentPlanTextLines(treatmentPlan);
	return Object.freeze({
		kind: "erp-authority",
		json: Object.freeze({
			kind: "erp-authority",
			manifest: manifest.json,
			layout: layout.json,
			projectionLock: projectionLock.json,
			treatment: Object.freeze({
				kind: "erp-treatment-authority",
				plan: treatmentPlan,
				textLines: treatmentTextLines,
			}),
			textLines: Object.freeze([
				...manifest.textLines,
				...layout.textLines,
				...projectionLock.textLines,
				...treatmentTextLines,
			]),
		}),
		diagnostics,
		textLines: Object.freeze([
			...manifest.textLines,
			...layout.textLines,
			...projectionLock.textLines,
			...treatmentTextLines,
		]),
	} satisfies GeneratorDoctorExtension);
};

export const erpGeneratorRegistration = createFamilyRegistration(
	generatorContracts.erp,
	generatorContracts,
	{
		createDoctorExtension: createErpDoctorExtension,
	},
);
