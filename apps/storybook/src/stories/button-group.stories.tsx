import { ButtonGroup } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Button Group",
	component: ButtonGroup,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Button Group surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="button-group" />,
};
