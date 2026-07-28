import { FileUpload } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/File Upload",
	component: FileUpload,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned FileUpload surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="file-upload" />,
	play: interactionFor("file-upload"),
};
