import { NativeSelect } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Native Select",
	component: NativeSelect,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Native Select surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="native-select" />,
};
