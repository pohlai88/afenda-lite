import { TreeView } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Data Display/Tree View",
	component: TreeView,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned TreeView surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="tree-view" />,
	play: interactionFor("tree-view"),
};
