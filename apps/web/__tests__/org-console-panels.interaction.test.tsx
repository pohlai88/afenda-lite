import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeleteOrganizationActionState } from "@/app/actions/delete-organization";
import type { ProvisionOrganizationActionState } from "@/app/actions/provision-organization";
import {
	OrgConsolePanels,
	type OrgListLoadState,
	type UsageLoadState,
} from "@/features/org-admin/org-console-panels";

const {
	provisionOrganizationAction,
	deleteOrganizationAction,
	getOrganizationUsageAction,
} = vi.hoisted(() => ({
	provisionOrganizationAction: vi.fn(),
	deleteOrganizationAction: vi.fn(),
	getOrganizationUsageAction: vi.fn(),
}));

vi.mock("@/app/actions/provision-organization", () => ({
	provisionOrganizationAction,
}));

vi.mock("@/app/actions/delete-organization", () => ({
	deleteOrganizationAction,
}));

vi.mock("@/app/actions/get-organization-usage", () => ({
	getOrganizationUsageAction,
}));

const READY_LIST: OrgListLoadState = {
	status: "ready",
	organizations: [
		{
			id: "org_1",
			slug: "acme-ops",
			name: "Acme Ops",
			lastActivityAt: "2026-07-17T08:00:00.000Z",
		},
	],
};

const READY_USAGE: UsageLoadState = {
	status: "ready",
	metrics: {
		orgId: "org_active",
		period: "2026-07",
		metrics: {
			activeMembers: { current: 2, band: "quiet" },
			rbacAuditEvents: { current: 4, band: "quiet" },
			activeRoleAssignments: { current: 1, band: "quiet" },
		},
		alerts: [],
	},
};

function deferredProvision(): {
	promise: Promise<ProvisionOrganizationActionState>;
	resolve: (value: ProvisionOrganizationActionState) => void;
} {
	let resolve!: (value: ProvisionOrganizationActionState) => void;
	const promise = new Promise<ProvisionOrganizationActionState>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function deferredDelete(): {
	promise: Promise<DeleteOrganizationActionState>;
	resolve: (value: DeleteOrganizationActionState) => void;
} {
	let resolve!: (value: DeleteOrganizationActionState) => void;
	const promise = new Promise<DeleteOrganizationActionState>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function renderPanels(
	overrides?: Partial<{
		orgList: OrgListLoadState;
		usage: UsageLoadState;
	}>,
) {
	return render(
		<OrgConsolePanels
			orgList={overrides?.orgList ?? READY_LIST}
			usage={overrides?.usage ?? READY_USAGE}
			activeOrgId="org_active"
		/>,
	);
}

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	vi.clearAllMocks();
	provisionOrganizationAction.mockResolvedValue(null);
	deleteOrganizationAction.mockResolvedValue(null);
	getOrganizationUsageAction.mockResolvedValue(null);
});

describe("OrgConsolePanels interaction", () => {
	it("renders org list and usage metrics", () => {
		renderPanels();
		expect(screen.getByText("Organizations")).toBeInTheDocument();
		expect(screen.getByText("Acme Ops")).toBeInTheDocument();
		expect(screen.getByText("Active organization usage")).toBeInTheDocument();
		expect(screen.getByText("Active members")).toBeInTheDocument();
	});

	it("shows empty state when org list is empty", () => {
		renderPanels({
			orgList: { status: "empty", organizations: [] },
		});
		expect(screen.getByText("No organizations in session")).toBeInTheDocument();
	});

	it("shows unavailable alert for org list failures", () => {
		renderPanels({
			orgList: {
				status: "unavailable",
				organizations: [],
				message: "Not authorized for organization console",
			},
		});
		expect(screen.getByText("Organizations unavailable")).toBeInTheDocument();
		expect(
			screen.getByText("Not authorized for organization console"),
		).toBeInTheDocument();
	});

	it("opens provision Sheet and submits FormData", async () => {
		const user = userEvent.setup();
		const deferred = deferredProvision();
		provisionOrganizationAction.mockReturnValue(deferred.promise);

		renderPanels();
		await user.click(
			screen.getByRole("button", { name: "Provision organization" }),
		);

		const dialog = await screen.findByRole("dialog");
		await user.type(within(dialog).getByLabelText(/Name/), "New Org");
		await user.type(within(dialog).getByLabelText(/Slug/), "new-org");
		await user.type(
			within(dialog).getByLabelText(/Admin email/),
			"admin@example.com",
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Provision organization" }),
		);

		await waitFor(() => {
			expect(provisionOrganizationAction).toHaveBeenCalled();
		});

		deferred.resolve({
			ok: true,
			data: {
				organization: { id: "org_new", slug: "new-org", name: "New Org" },
				invitationId: "inv_1",
			},
		});

		await waitFor(() => {
			expect(screen.getByText("Organization provisioned")).toBeInTheDocument();
		});
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("surfaces provision partial-failure disposition without closing Sheet", async () => {
		const user = userEvent.setup();
		provisionOrganizationAction.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Organization created; invite failed — retry invite",
			details: {
				disposition: "org_created_invite_failed",
				organization: {
					id: "org_partial",
					slug: "partial-org",
					name: "Partial",
				},
			},
		});

		renderPanels();
		await user.click(
			screen.getByRole("button", { name: "Provision organization" }),
		);
		const dialog = await screen.findByRole("dialog");
		await user.type(within(dialog).getByLabelText(/Name/), "Partial");
		await user.type(within(dialog).getByLabelText(/Slug/), "partial-org");
		await user.type(
			within(dialog).getByLabelText(/Admin email/),
			"admin@example.com",
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Provision organization" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Partial provision")).toBeInTheDocument();
		});
		expect(screen.getByText("org_created_invite_failed")).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("opens hard-delete AlertDialog with permanent copy", async () => {
		const user = userEvent.setup();
		const deferred = deferredDelete();
		deleteOrganizationAction.mockReturnValue(deferred.promise);

		renderPanels();
		await user.click(screen.getByRole("button", { name: "Delete" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByText(/Permanently delete organization/i),
		).toBeInTheDocument();
		expect(within(dialog).getByText(/hard-deletes/i)).toBeInTheDocument();
		expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
		expect(within(dialog).queryByText(/deactivat/i)).not.toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("button", { name: "Permanently delete" }),
		);

		await waitFor(() => {
			expect(deleteOrganizationAction).toHaveBeenCalled();
		});

		deferred.resolve({ ok: true, data: { orgId: "org_1" } });

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("refreshes usage via Action form", async () => {
		const user = userEvent.setup();
		getOrganizationUsageAction.mockResolvedValue({
			ok: true,
			data: {
				orgId: "org_active",
				period: "2026-06",
				metrics: {
					activeMembers: { current: 9, band: "active" },
					rbacAuditEvents: { current: 1, band: "quiet" },
					activeRoleAssignments: { current: 2, band: "quiet" },
				},
				alerts: [],
			},
		});

		renderPanels();
		const period = screen.getByLabelText(/Period/);
		await user.clear(period);
		await user.type(period, "2026-06");
		await user.click(screen.getByRole("button", { name: "Refresh usage" }));

		await waitFor(() => {
			expect(getOrganizationUsageAction).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(screen.getByText("9")).toBeInTheDocument();
		});
	});
});
