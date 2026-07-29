import { defineManifestContract } from "./manifest.contract";

export const collapsibleContract = defineManifestContract({
	id: "ui.collapsible.contract",
	component: "ui.collapsible",
	purpose:
		"Discloses one subordinate optional-detail region from a single adjacent trigger so operators can reveal supporting evidence without opening a second surface or leaving the parent ERP record.",
	ownership: {
		componentOwns: [
			"Single-region disclosure interaction, expanded-state semantics, trigger-to-content relationship, and keyboard focus on the controlling trigger.",
		],
		consumerOwns: [
			"Trigger label, region content, controlled open state, persistence, permissions, and whether one-region disclosure is appropriate for the task.",
		],
	},
	semanticBoundaries: [
		"Collapsed presentation does not make content unauthorized, unloaded, or deleted — disclosure is presentation only.",
		"Open versus closed state does not represent selection, approval, workflow completion, or domain lifecycle.",
		"Collapsible does not own validation, authorization, data loading, or form submission.",
	],
	rules: [
		"Use Collapsible for one subordinate region whose content may be temporarily hidden beside a primary record or action.",
		"Keep the trigger adjacent to and descriptive of the controlled region.",
		"Preserve controlled open state when the surrounding workflow must restore disclosure after navigation or refresh.",
		"Keep required form fields, primary actions, blocking errors, and mandatory legal text visible outside the collapsed region.",
		"Prefer Collapsible for one optional region; prefer Accordion when several peer optional-detail sections share one disclosure list.",
		"Do not use Collapsible as page navigation, a modal substitute, a stepper, or a status indicator.",
	],
	accessibility: [
		"Use an interactive trigger with expanded and controls relationships to the disclosed region.",
		"Keep the trigger keyboard operable with a visible focus indicator.",
		"Maintain sensible reading order when content becomes visible for assistive technology.",
		"Pair asChild triggers with a real button or link element — do not wrap non-interactive text as the only control.",
	],
	prohibitedUsage: [
		"Do not hide mandatory errors, primary Save/Submit actions, or required legal information by default.",
		"Do not use Collapsible as a modal, drawer, or navigation substitute.",
		"Do not infer data loading, authorization, or domain lifecycle from open state.",
		"Do not replace Accordion when several related optional sections belong in one peer list.",
	],
});
