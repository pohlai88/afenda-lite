import { ColumnVisibilityMenu } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Data/Column Visibility Menu",
	component: ColumnVisibilityMenu,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned ColumnVisibilityMenu surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof ColumnVisibilityMenu>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => (
		<EnterpriseComponentShowcase component="column-visibility-menu" />
	),
	play: interactionFor("column-visibility-menu"),
};
