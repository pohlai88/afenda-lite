import { ToggleGroup } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Toggle Group",
	component: ToggleGroup,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Toggle Group surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="toggle-group" />,
};
