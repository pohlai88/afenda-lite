import { InputGroup } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Input Group",
	component: InputGroup,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Input Group surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="input-group" />,
};
