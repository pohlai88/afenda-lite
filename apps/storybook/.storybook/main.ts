import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { storybookEvidencePlugin } from "./storybook-evidence.ts";

const config = {
	stories: ["../src/stories/**/*.stories.tsx"],
	addons: [
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	async viteFinal(viteConfig) {
		viteConfig.plugins = [
			...(viteConfig.plugins ?? []),
			storybookEvidencePlugin(),
			tailwindcss(),
		];
		return viteConfig;
	},
} satisfies StorybookConfig;

export default config;
