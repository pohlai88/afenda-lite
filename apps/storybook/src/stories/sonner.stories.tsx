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

function showSuccessToast(): void {
	toast.success("Invoice saved");
}

function showErrorToast(): void {
	toast.error("Posting failed");
}

function showWarningToast(): void {
	toast.warning("Evidence expires in 7 days");
}
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
				<Button onClick={showSuccessToast}>Show success</Button>
				<Button onClick={showErrorToast} variant="outline">
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
			<Button onClick={showWarningToast} variant="outline">
				Announce warning
			</Button>
			<p className="text-foreground-secondary text-sm">
				Severity determines announcement urgency; repeated outcomes must be
				deduplicated.
			</p>
		</div>
	),
};
export const VariantsAndSizes: Story = {
	render: () => (
		<p className="text-foreground-secondary text-sm">
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
				<p className="text-foreground-secondary text-sm">
					Call toast only after the authoritative command result is known.
				</p>
			</StorySection>
			<StorySection title="Do not: replace durable state">
				<p className="text-foreground-secondary text-sm">
					Keep actionable failures in the workflow with Alert or FormError.
				</p>
			</StorySection>
		</div>
	),
};
