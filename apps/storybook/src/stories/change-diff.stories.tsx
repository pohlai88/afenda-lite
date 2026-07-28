import { ChangeDiff } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Data Display/Change Diff",
	component: ChangeDiff,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned ChangeDiff surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof ChangeDiff>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="change-diff" />,
};
