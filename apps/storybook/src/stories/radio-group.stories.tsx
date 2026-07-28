import { RadioGroup } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Radio Group",
	component: RadioGroup,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Radio Group surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="radio-group" />,
};
