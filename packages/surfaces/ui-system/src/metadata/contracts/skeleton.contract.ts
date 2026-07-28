import { defineManifestContract } from "./manifest.contract";

export const skeletonContract = defineManifestContract({
	id: "ui.skeleton.contract",
	component: "ui.skeleton",
	purpose:
		"Provides non-semantic loading placeholders that preserve expected content layout.",
	ownership: {
		componentOwns: [
			"Skeleton placeholder presentation, animation, and layout-shape composition.",
		],
		consumerOwns: [
			"Loading detection, placeholder shape, announcement strategy, timeout, error, and final content.",
		],
	},
	semanticBoundaries: [
		"A skeleton does not communicate what is loading or whether loading succeeded.",
		"Placeholder geometry does not guarantee final content dimensions.",
	],
	rules: [
		"Use Skeleton to reduce layout shift while known content is loading.",
		"Match the broad shape of expected content without reproducing misleading detail.",
		"Replace skeletons with explicit error or empty states when loading ends.",
	],
	accessibility: [
		"Hide purely decorative skeletons from assistive technologies.",
		"Communicate loading state through the owning region when necessary.",
		"Respect reduced-motion preferences for animated placeholders.",
	],
	prohibitedUsage: [
		"Do not leave Skeleton visible indefinitely after failure.",
		"Do not use Skeleton as decorative page chrome.",
		"Do not announce every individual placeholder.",
	],
});
