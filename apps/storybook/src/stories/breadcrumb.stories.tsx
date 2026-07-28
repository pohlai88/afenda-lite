import { Breadcrumb } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Navigation/Breadcrumb",
	component: Breadcrumb,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Breadcrumb surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="breadcrumb" />,
};
