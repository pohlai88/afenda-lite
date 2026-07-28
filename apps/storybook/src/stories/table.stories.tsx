import { Table } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Data Display/Table",
	component: Table,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Table surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="table" />,
};
