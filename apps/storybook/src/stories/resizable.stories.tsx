import { ResizablePanelGroup } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Layout/Resizable",
	component: ResizablePanelGroup,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned ResizablePanelGroup surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="resizable" />,
};
