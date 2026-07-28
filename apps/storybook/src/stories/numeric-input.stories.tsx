import { NumberInput } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Forms/Numeric Input",
	component: NumberInput,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned NumberInput surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="numeric-input" />,
};
