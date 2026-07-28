import { defineManifestContract } from "./manifest.contract";

export const kbdContract = defineManifestContract({
	id: "ui.kbd.contract",
	component: "ui.kbd",
	purpose:
		"Displays keyboard keys or shortcut sequences as supplemental interaction guidance.",
	ownership: {
		componentOwns: [
			"Keyboard-key presentation and grouped shortcut composition.",
		],
		consumerOwns: [
			"Shortcut registration, platform mapping, conflict handling, availability, and instruction wording.",
		],
	},
	semanticBoundaries: [
		"Displayed shortcut text does not register or authorize a keyboard command.",
		"A platform key label does not guarantee the shortcut is available in every context.",
	],
	rules: [
		"Use Kbd only for shortcuts that are actually implemented in the current context.",
		"Display platform-appropriate key names when they differ.",
		"Keep shortcut sequences in the same order users press them.",
	],
	accessibility: [
		"Provide textual instruction around unfamiliar shortcut sequences.",
		"Ensure symbols have understandable accessible text.",
		"Never make the shortcut the only way to perform an action.",
	],
	prohibitedUsage: [
		"Do not advertise unimplemented shortcuts.",
		"Do not use Kbd as a button or interactive control.",
		"Do not require memorized shortcuts for essential workflows.",
	],
});
