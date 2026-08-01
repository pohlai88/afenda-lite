import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { storybookEvidencePlugin } from "./storybook-evidence.ts";

const productionAddons = ["@storybook/addon-docs", "@storybook/addon-a11y"];
const developmentAddons = ["@storybook/addon-vitest"];
const isProductionBuild = process.env.NODE_ENV === "production";

const config = {
	stories: ["../src/stories/**/*.stories.tsx"],
	addons: [
		...productionAddons,
		...(isProductionBuild ? [] : developmentAddons),
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal(viteConfig) {
		viteConfig.plugins = [
			...(viteConfig.plugins ?? []),
			storybookEvidencePlugin(),
			tailwindcss(),
		];
		return viteConfig;
	},
} satisfies StorybookConfig;

export default config;
