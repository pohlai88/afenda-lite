import { defineManifestContract } from "./manifest.contract";

export const kbdContract = defineManifestContract({
	id: "ui.kbd.contract",
	component: "ui.kbd",
	purpose:
		"Displays keyboard keys or shortcut sequences as supplemental ERP interaction guidance — command palette, row confirm, posting chords — without registering, authorizing, or executing the command.",
	ownership: {
		componentOwns: [
			"Keyboard-key presentation, grouped shortcut composition, and non-interactive key chrome.",
		],
		consumerOwns: [
			"Shortcut registration, platform mapping, conflict handling, availability, instruction wording, and alternate non-keyboard paths.",
		],
	},
	semanticBoundaries: [
		"Displayed shortcut text does not register or authorize a keyboard command.",
		"A platform key label does not guarantee the shortcut is available in every context.",
		"Kbd does not replace Button for primary actions, Tooltip for short labels alone, or help content for full shortcut legends.",
	],
	rules: [
		"This contract governs Kbd and KbdGroup as one keyboard-guidance family.",
		"Use Kbd only for shortcuts that are actually implemented in the current context.",
		"Display platform-appropriate key names when they differ.",
		"Keep shortcut sequences in the same order users press them.",
		"Keep a labelled Button or equivalent as the primary path — shortcuts stay supplemental.",
		"Prefer Card composition when documenting workbench shortcuts beside toolbar actions.",
	],
	accessibility: [
		"Provide textual instruction around unfamiliar shortcut sequences.",
		"Ensure symbols have understandable accessible text on the key or group.",
		"Never make the shortcut the only way to perform an action.",
		"Keep Kbd non-interactive — do not rely on it as a focusable control.",
	],
	prohibitedUsage: [
		"Do not advertise unimplemented shortcuts.",
		"Do not use Kbd as a button or interactive control.",
		"Do not require memorized shortcuts for essential workflows.",
		"Do not omit an alternate labelled control when documenting a chord.",
		"Do not invent platform labels that do not match the registered binding.",
	],
});
