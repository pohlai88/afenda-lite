import { defineManifestContract } from "./manifest.contract";

export const stepperContract = defineManifestContract({
	id: "ui.stepper.contract",
	component: "ui.stepper",
	purpose:
		"Presents ordered ERP workflow steps with current, completed, upcoming, and exceptional state context for paths such as invoice draft → validation → approval → posting → settlement.",
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
		"Stepper does not replace StatusBadge for record lifecycle authority.",
		"Error step chrome does not own remediation actions or FormError field messages.",
	],
	rules: [
		"This contract governs Stepper and StepperStep as one ordered-workflow family.",
		"Use Stepper for a genuinely ordered workflow with stable step names.",
		"Derive current and completed states from authoritative workflow data.",
		"Explain blocked, failed, skipped, or optional steps in text (description).",
		"Keep primary Approve or Submit actions visible outside decorative step chrome when they are required.",
		"Use status complete | current | upcoming | error consistently within one workflow surface.",
	],
	accessibility: [
		"Expose ordered structure (ol) and identify the current step programmatically (aria-current=step).",
		"Communicate status without relying on connector or color alone — title and description carry meaning.",
		"Keep interactive step navigation keyboard operable when feature policy permits it.",
	],
	prohibitedUsage: [
		"Do not use Stepper as tabs or decorative progress.",
		"Do not infer transition eligibility from visual step state.",
		"Do not allow navigation that bypasses feature-owned workflow policy.",
		"Do not treat step styling as StatusBadge-style lifecycle authority.",
		"Do not bury the only Approve / Post action inside step chrome alone.",
	],
});
