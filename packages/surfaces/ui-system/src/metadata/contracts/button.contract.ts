import { defineManifestContract } from "./manifest.contract";

export const buttonContract = defineManifestContract({
	id: "ui.button.contract",
	component: "ui.button",
	purpose:
		"Provides semantic action triggers for ERP commands and workflow decisions.",
	ownership: {
		componentOwns: [
			"Action-trigger presentation, approved visual variants, sizing, and native interaction semantics.",
		],
		consumerOwns: [
			"Authorization, visibility, confirmation policy, command execution, retry policy, and outcome handling.",
		],
	},
	semanticBoundaries: [
		"Visual emphasis does not determine whether an action is authorized.",
		"Destructive styling does not determine whether confirmation is required.",
		"Pending presentation does not determine retry or idempotency policy.",
	],
	approvedVariants: {
		default: {
			meaning: "Primary or recommended action in the current decision context.",
			allowedWhen: [
				"The action is the recommended next step in the local workflow.",
			],
			prohibitedWhen: [
				"The action is secondary, optional, or purely navigational.",
			],
		},
		destructive: {
			meaning:
				"Action that removes, revokes, invalidates, or causes a harmful outcome that is difficult to recover.",
			allowedWhen: [
				"The action deletes, revokes, voids, permanently cancels, or otherwise causes a harmful outcome that is difficult to reverse.",
			],
			prohibitedWhen: [
				"The action is merely important, final, privileged, or workflow-authoritative.",
				"The action merely closes, dismisses, or abandons an uncommitted interaction.",
			],
		},
		outline: {
			meaning:
				"Secondary action with clear visual affordance and moderate emphasis.",
			allowedWhen: [
				"The action supports the primary workflow without competing with the recommended next step.",
			],
		},
		secondary: {
			meaning: "Neutral supporting action.",
			allowedWhen: [
				"The action is useful but is not the recommended next step.",
			],
		},
		ghost: {
			meaning:
				"Low-emphasis contextual action for compact or repeated interfaces.",
			allowedWhen: [
				"The action appears in dense toolbars, table rows, cards, or repeated control groups.",
			],
			prohibitedWhen: [
				"The action must remain immediately visible as a primary workflow decision.",
			],
		},
		link: {
			meaning: "Text-style treatment for a low-emphasis action or real link.",
			allowedWhen: [
				"The control performs a low-emphasis action while retaining native button semantics.",
				"For navigation, Button uses asChild with a semantic anchor or framework Link that has a real destination.",
			],
			prohibitedWhen: [
				"The action submits, mutates, or confirms data.",
				"A URL destination is rendered with button semantics instead of a semantic anchor or framework Link.",
			],
		},
	},
	approvedSizes: {
		default: {
			meaning: "Standard command size.",
			allowedWhen: [
				"Most forms, dialogs, page headers, and ordinary action groups.",
			],
		},
		xs: {
			meaning: "Extra-compact command size.",
			allowedWhen: [
				"Dense tables or metadata rows where available space is constrained.",
			],
			prohibitedWhen: [
				"The control is a primary action or requires prominent touch interaction.",
			],
		},
		sm: {
			meaning: "Compact command size.",
			allowedWhen: [
				"Toolbars, table rows, filters, and secondary action clusters.",
			],
		},
		lg: {
			meaning: "Large prominent command size.",
			allowedWhen: [
				"Sparse confirmation surfaces, onboarding steps, or focused calls to action.",
			],
			prohibitedWhen: ["Dense forms, data tables, or repeated action groups."],
		},
		icon: {
			meaning: "Standard icon-only action.",
			allowedWhen: [
				"The control has an explicit accessible name and represents a familiar action.",
			],
		},
		"icon-xs": {
			meaning: "Extra-compact icon-only action.",
			allowedWhen: [
				"The control has an explicit accessible name and appears in dense repeated controls with a visible nearby label or supporting tooltip.",
			],
		},
		"icon-sm": {
			meaning: "Compact icon-only action.",
			allowedWhen: [
				"The control has an explicit accessible name and appears in a toolbar or table row.",
			],
		},
		"icon-lg": {
			meaning: "Large icon-only action.",
			allowedWhen: [
				"The control has an explicit accessible name and appears on a sparse surface where the icon is the primary affordance.",
			],
			prohibitedWhen: [
				"The icon meaning is unfamiliar, ambiguous, or domain-specific.",
			],
		},
	},
	rules: [
		"Prefer one visually dominant primary action within each independent decision context, such as a page header, form footer, dialog, or workflow panel.",
		"Multiple primary actions in the same decision context require genuinely equivalent workflow importance.",
		"Set an explicit button type inside forms so non-submit actions cannot trigger accidental submission.",
		"Icon-only buttons require a programmatic accessible name; a tooltip may supplement but must not be the sole naming mechanism.",
		"Use disabled only when the reason is apparent or explained by nearby interface content.",
		"Do not use disabled state as a substitute for authorization or feature-availability policy; feature code decides whether an unavailable action is hidden, disabled with explanation, or replaced with guidance.",
		"When aria-disabled is used instead of native disabled, prevent activation while preserving the intended focus and explanation behavior.",
		"Feature code determines when an action is pending; Button must prevent activation while pending and preserve enough of the action label to identify the running command.",
		"Button text should describe the action outcome rather than use vague labels such as OK or Yes.",
	],
	accessibility: [
		"Preserve native button semantics unless asChild delegates to another semantically appropriate interactive element.",
		"Keep visible keyboard focus treatment intact.",
		"Do not rely on color alone for destructive meaning.",
		"Icon-only controls must expose an accessible name through visible text, aria-label, or an equivalent labelled relationship.",
		"Disabled and pending states must remain distinguishable without relying only on reduced opacity.",
		"Pending actions must communicate progress without repeatedly announcing unchanged labels.",
		"Pending icon-only actions must retain action context in their accessible name, such as Saving supplier rather than only Loading.",
	],
	prohibitedUsage: [
		"Do not use the link variant for data mutations.",
		"Do not use the destructive variant for ordinary emphasis, importance, finality, or privileged workflow actions.",
		"Do not render a native button for URL navigation; use Button asChild with a semantic anchor or framework Link.",
		"Do not use asChild to delegate Button styling to a non-interactive element.",
		"Do not hide critical actions behind icon-only controls without a clear labelling strategy.",
		"Do not present multiple visually dominant actions when one action is clearly recommended.",
		"Do not use a disabled button to conceal missing authorization handling, unmet workflow policy, or unavailable feature logic.",
		"Do not place confirmation, authorization, or command-result behavior inside the reusable Button component.",
	],
});
