import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	FormField,
	Input,
} from "@afenda/ui-system";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

async function expectNoA11yViolations(container: HTMLElement) {
	const results = await axe.run(container, {
		rules: {
			// jsdom lacks full color computation for contrast checks
			"color-contrast": { enabled: false },
		},
	});
	expect(
		results.violations,
		JSON.stringify(results.violations, null, 2),
	).toEqual([]);
}

describe("@afenda/ui-system — axe a11y suite", () => {
	it("Dialog trigger and closed tree have no serious violations", async () => {
		const { container } = render(
			<Dialog>
				<DialogTrigger asChild>
					<Button type="button">Open dialog</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit record</DialogTitle>
						<DialogDescription>Update the selected entity.</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>,
		);
		await expectNoA11yViolations(container);
	});

	it("AlertDialog trigger tree has no serious violations", async () => {
		const { container } = render(
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="destructive">
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm delete</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction>Continue</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		);
		await expectNoA11yViolations(container);
	});

	it("FormField with Input has no serious violations", async () => {
		const { container } = render(
			<FormField
				label="Email"
				description="Work email address"
				error="Email is required"
				required
			>
				<Input type="email" defaultValue="" />
			</FormField>,
		);
		await expectNoA11yViolations(container);
	});
});
