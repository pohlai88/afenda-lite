declare module "virtual:afenda-storybook-evidence" {
	import type { StorybookContractEvidence } from "../.storybook/storybook-evidence";

	export const storybookEvidence: Readonly<
		Record<string, StorybookContractEvidence>
	>;
}
