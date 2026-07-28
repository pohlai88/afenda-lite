import { KeyValue } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Data Display/Key Value",
	component: KeyValue,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Key Value surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="key-value" />,
};
