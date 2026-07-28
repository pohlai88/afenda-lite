import { AsyncState } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Feedback/Async State",
	component: AsyncState,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned AsyncState surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof AsyncState>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="async-state" />,
};
