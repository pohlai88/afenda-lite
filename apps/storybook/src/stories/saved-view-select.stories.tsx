import { SavedViewSelect } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Data/Saved View Select",
	component: SavedViewSelect,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned SavedViewSelect surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof SavedViewSelect>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="saved-view-select" />,
	play: interactionFor("saved-view-select"),
};
