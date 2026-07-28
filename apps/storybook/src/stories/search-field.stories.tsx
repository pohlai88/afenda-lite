import { SearchField } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/Search Field",
	component: SearchField,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned SearchField surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="search-field" />,
	play: interactionFor("search-field"),
};
