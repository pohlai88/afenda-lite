import { defineManifestContract } from "./manifest.contract";

export const accordionContract = defineManifestContract({
	id: "ui.accordion.contract",
	component: "ui.accordion",
	purpose:
		"Discloses related optional-detail sections through labelled accordion items so operators can expand one policy or guidance topic without leaving the parent ERP surface.",
	ownership: {
		componentOwns: [
			"Accordion disclosure interaction, expanded-state semantics, trigger-to-content relationships, and keyboard focus on triggers.",
		],
		consumerOwns: [
			"Section labels, panel content, single-versus-multiple expansion policy, controlled state, persistence, and whether disclosure is appropriate for the task.",
		],
	},
	semanticBoundaries: [
		"Collapsed content is still present in the product model — disclosure does not make content unauthorized, unloaded, or deleted.",
		"Expanded presentation does not imply selection, approval, workflow completion, or domain state change.",
		"Accordion does not own validation, authorization, or form submission.",
	],
	rules: [
		"Use Accordion for related optional-detail sections such as onboarding policy, remittance rules, or audit guidance beside a primary task.",
		"Keep each trigger label concise and descriptive of the panel it reveals.",
		"Choose type=single or type=multiple from the information task — prefer single when only one topic should stay focused.",
		"Keep required form fields, primary actions, and blocking errors visible outside collapsed panels.",
		"Prefer Accordion when several peer sections share one disclosure list; use Collapsible for one subordinate region.",
		"Do not use Accordion as page navigation, a stepper, a modal substitute, or a status indicator.",
	],
	accessibility: [
		"Preserve button semantics, expanded state, and controlled-region relationships on each trigger.",
		"Keep keyboard focus visible on every AccordionTrigger.",
		"Maintain logical heading hierarchy around accordion triggers within the parent page or Card.",
		"Ensure expanded panel content remains in a sensible reading order for assistive technology.",
	],
	prohibitedUsage: [
		"Do not hide required form errors, mandatory legal text, or primary Save/Submit actions inside collapsed panels.",
		"Do not encode domain lifecycle, posting state, or permissions in open versus closed disclosure.",
		"Do not nest Accordions when a flatter hierarchy, Tabs, or a dedicated page section is clearer.",
		"Do not use Accordion to implement multi-step wizards or long-running workflows.",
	],
});
