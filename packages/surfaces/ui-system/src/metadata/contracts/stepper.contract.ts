import { defineManifestContract } from "./manifest.contract";

export const stepperContract = defineManifestContract({
	id: "ui.stepper.contract",
	component: "ui.stepper",
	purpose:
		"Presents ordered workflow steps with current, completed, upcoming, and exceptional state context.",
	ownership: {
		componentOwns: [
			"Ordered-step presentation, connectors, current and completed styling, and accessible step hierarchy.",
		],
		consumerOwns: [
			"Workflow definition, current step, transition authorization, completion truth, navigation, and persistence.",
		],
	},
	semanticBoundaries: [
		"Completed styling does not prove that a domain transition committed successfully.",
		"Step order does not authorize forward, backward, or skipped transitions.",
	],
	rules: [
		"Use Stepper for a genuinely ordered workflow with stable step names.",
		"Derive current and completed states from authoritative workflow data.",
		"Explain blocked, failed, skipped, or optional steps in text.",
	],
	accessibility: [
		"Expose ordered structure and identify the current step programmatically.",
		"Communicate status without relying on connector or color alone.",
		"Keep interactive step navigation keyboard operable when feature policy permits it.",
	],
	prohibitedUsage: [
		"Do not use Stepper as tabs or decorative progress.",
		"Do not infer transition eligibility from visual step state.",
		"Do not allow navigation that bypasses feature-owned workflow policy.",
	],
});
