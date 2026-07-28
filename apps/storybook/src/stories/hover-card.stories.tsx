import { HoverCard } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Overlays/Hover Card",
	component: HoverCard,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Hover Card surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="hover-card" />,
};
