import { DatePicker } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Date Picker",
	component: DatePicker,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Date Picker surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="date-picker" />,
};
