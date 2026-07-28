import { ChartContainer } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Data Display/Chart",
	component: ChartContainer,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned ChartContainer surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="chart" />,
};
