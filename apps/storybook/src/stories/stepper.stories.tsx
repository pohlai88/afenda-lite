import { Stepper } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Navigation/Stepper",
	component: Stepper,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Stepper surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="stepper" />,
};
