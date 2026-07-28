import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Navigation/Menubar",
	component: Menubar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Desktop keyboard command groups for dense operational work. Menubar is not a replacement for primary application or mobile navigation.",
			},
		},
	},
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	render: () => (
		<div data-visual-test="true" className="w-[min(720px,calc(100vw-4rem))]">
			<Menubar>
				<MenubarMenu>
					<MenubarTrigger>Record</MenubarTrigger>
					<MenubarContent>
						<MenubarLabel>Journal</MenubarLabel>
						<MenubarItem>
							Open record<MenubarShortcut>⌘O</MenubarShortcut>
						</MenubarItem>
						<MenubarItem>
							Duplicate draft<MenubarShortcut>⇧⌘D</MenubarShortcut>
						</MenubarItem>
						<MenubarSeparator />
						<MenubarCheckboxItem checked>
							Show audit details
						</MenubarCheckboxItem>
						<MenubarSub>
							<MenubarSubTrigger>Export</MenubarSubTrigger>
							<MenubarSubContent>
								<MenubarItem>Export PDF</MenubarItem>
								<MenubarItem>Export CSV</MenubarItem>
							</MenubarSubContent>
						</MenubarSub>
						<MenubarItem disabled>Delete posted record</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
				<MenubarMenu>
					<MenubarTrigger>View</MenubarTrigger>
					<MenubarContent>
						<MenubarLabel>Density</MenubarLabel>
						<MenubarRadioGroup value="comfortable">
							<MenubarRadioItem value="comfortable">
								Comfortable
							</MenubarRadioItem>
							<MenubarRadioItem value="compact">Compact</MenubarRadioItem>
						</MenubarRadioGroup>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	),
	play: interactionFor("menubar"),
};
