import { DateTimePicker } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Forms/Date Time Picker",
	component: DateTimePicker,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned DateTimePicker surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="date-time-picker" />,
};
