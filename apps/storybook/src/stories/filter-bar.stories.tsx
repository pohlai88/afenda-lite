import { FilterBar } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Data/Filter Bar",
	component: FilterBar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned FilterBar surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="filter-bar" />,
};
