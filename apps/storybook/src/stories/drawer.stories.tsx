import {
	Button,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Drawer",
	component: Drawer,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Touch-oriented transient work surface for short review and decision tasks. Use Sheet when the workflow does not require drawer gestures.",
			},
		},
	},
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	render: () => (
		<div data-visual-test="true" className="w-[min(720px,calc(100vw-4rem))]">
			<Drawer>
				<DrawerTrigger asChild>
					<Button>Review posting batch</Button>
				</DrawerTrigger>
				<DrawerContent>
					<div className="mx-auto w-full max-w-lg">
						<DrawerHeader>
							<DrawerTitle>Review posting batch</DrawerTitle>
							<DrawerDescription>
								Batch PB-2026-0728 contains 18 balanced journals and is ready
								for final review.
							</DrawerDescription>
						</DrawerHeader>
						<div className="grid gap-2 px-4 text-sm text-foreground-secondary">
							<p>Debit total: MYR 184,250.00</p>
							<p>Credit total: MYR 184,250.00</p>
						</div>
						<DrawerFooter>
							<Button>Continue review</Button>
							<DrawerClose asChild>
								<Button variant="outline">Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	),
	play: interactionFor("drawer"),
};
