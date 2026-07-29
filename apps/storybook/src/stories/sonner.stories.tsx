import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Toaster,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.sonner");
const meta = {
	title: "UI System/Sonner",
	component: Toaster,
	tags: ["autodocs", "test"],
	parameters: { ...contractDocsParameters(evidence, "Sonner") },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

function ToastControls() {
	return (
		<>
			<Toaster />
			<div className="flex flex-wrap gap-2">
				<Button onClick={() => toast.success("Invoice saved")}>
					Show success
				</Button>
				<Button variant="outline" onClick={() => toast.error("Posting failed")}>
					Show error
				</Button>
			</div>
		</>
	);
}
export const Overview: Story = {
	tags: ["visual"],
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Command outcomes</CardTitle>
			</CardHeader>
			<CardContent>
				<ToastControls />
			</CardContent>
		</Card>
	),
};
export const Usage: Story = {
	render: () => (
		<StorySection title="Transient confirmed outcome">
			<ToastControls />
		</StorySection>
	),
};
export const StatesAndAccessibility: Story = {
	render: () => (
		<div className="grid gap-3">
			<Toaster />
			<Button
				variant="outline"
				onClick={() => toast.warning("Evidence expires in 7 days")}
			>
				Announce warning
			</Button>
			<p className="text-sm text-foreground-secondary">
				Severity determines announcement urgency; repeated outcomes must be
				deduplicated.
			</p>
		</div>
	),
};
export const VariantsAndSizes: Story = {
	render: () => (
		<p className="text-sm text-foreground-secondary">
			Sonner severity is selected by the toast API; one Toaster owns viewport,
			theme, stacking, and dismissal.
		</p>
	),
};
export const Composition: Story = { render: () => <ToastControls /> };
export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: announce confirmed outcomes">
				<p className="text-sm text-foreground-secondary">
					Call toast only after the authoritative command result is known.
				</p>
			</StorySection>
			<StorySection title="Do not: replace durable state">
				<p className="text-sm text-foreground-secondary">
					Keep actionable failures in the workflow with Alert or FormError.
				</p>
			</StorySection>
		</div>
	),
};
