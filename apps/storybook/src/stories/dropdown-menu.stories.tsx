import { DropdownMenu } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Dropdown Menu",
	component: DropdownMenu,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Dropdown Menu surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="dropdown-menu" />,
	play: interactionFor("dropdown-menu"),
};
