import { Pagination } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Navigation/Pagination",
	component: Pagination,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Pagination surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="pagination" />,
};
