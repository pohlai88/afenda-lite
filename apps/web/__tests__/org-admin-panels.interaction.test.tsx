import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RevokeOrgRoleActionState } from "@/app/actions/revoke-org-role";
import {
	type OrgAssignmentRow,
	type OrgAuditRow,
	type OrgRoleRow,
	OrgAdminPanels,
} from "@/features/org-admin/org-admin-panels";

const { revokeOrgRoleAction } = vi.hoisted(() => ({
	revokeOrgRoleAction: vi.fn(),
}));

vi.mock("@/app/actions/revoke-org-role", () => ({
	revokeOrgRoleAction,
}));

vi.mock("@/features/org-admin/assign-org-role-form", () => ({
	AssignOrgRoleForm: () => <div data-testid="assign-org-role-form" />,
}));

const ROLES: OrgRoleRow[] = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		name: "Org Admin",
		active: true,
		isSystemTemplate: true,
	},
];

const ASSIGNMENTS: OrgAssignmentRow[] = [
	{
		id: "asg_1",
		userId: "user_neon_abc",
		roleId: ROLES[0].id,
		roleName: "Org Admin",
		scopeType: "organization",
	},
];

const AUDIT_ROWS: OrgAuditRow[] = [
	{
		id: "aud_1",
		action: "role.assign",
		targetType: "assignment",
	},
];

const READY_DIRECTORY = {
	status: "ready" as const,
	options: [{ id: "user_neon_abc", label: "Ada · ada@example.com" }],
};

function deferredAction(): {
	promise: Promise<RevokeOrgRoleActionState>;
	resolve: (value: RevokeOrgRoleActionState) => void;
} {
	let resolve!: (value: RevokeOrgRoleActionState) => void;
	const promise = new Promise<RevokeOrgRoleActionState>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function renderPanels(
	overrides?: Partial<{
		roles: OrgRoleRow[];
		assignments: OrgAssignmentRow[];
		auditRows: OrgAuditRow[];
	}>,
) {
	return render(
		<OrgAdminPanels
			roles={overrides?.roles ?? ROLES}
			assignments={overrides?.assignments ?? ASSIGNMENTS}
			auditRows={overrides?.auditRows ?? AUDIT_ROWS}
			memberDirectory={READY_DIRECTORY}
		/>,
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	revokeOrgRoleAction.mockReset();
});

describe("OrgAdminPanels — revoke + audit STABILITY", () => {
	it("renders identifier cells with Code and mounts assign form", () => {
		renderPanels();

		expect(screen.getByTestId("assign-org-role-form")).toBeInTheDocument();
		expect(screen.getByText("user_neon_abc")).toBeInTheDocument();
		expect(
			screen.getByText("11111111-1111-4111-8111-111111111111"),
		).toBeInTheDocument();
	});

	it("opens audit View Dialog as read detail", async () => {
		const user = userEvent.setup();
		renderPanels();

		await user.click(screen.getByRole("button", { name: /^view$/i }));

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByText("Audit event")).toBeInTheDocument();
		expect(within(dialog).getByText("role.assign")).toBeInTheDocument();
		expect(within(dialog).getByText("aud_1")).toBeInTheDocument();
	});

	it("opens AlertDialog for revoke and submits assignmentId", async () => {
		const user = userEvent.setup();
		revokeOrgRoleAction.mockResolvedValue({
			ok: true,
			data: {
				assignmentId: "asg_1",
				userId: "user_neon_abc",
				roleId: ROLES[0].id,
				auditId: "aud_rev_1",
			},
		} satisfies RevokeOrgRoleActionState);

		renderPanels();

		await user.click(screen.getByRole("button", { name: /^revoke$/i }));

		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText("Revoke role assignment"),
		).toBeInTheDocument();
		expect(within(dialog).getByText("asg_1")).toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("button", { name: /revoke assignment/i }),
		);

		await waitFor(() => {
			expect(revokeOrgRoleAction).toHaveBeenCalled();
		});
		const formData = revokeOrgRoleAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("assignmentId")).toBe("asg_1");

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("shows pending revoke state then FormError on failure", async () => {
		const user = userEvent.setup();
		const first = deferredAction();
		revokeOrgRoleAction.mockImplementation(() => first.promise);

		renderPanels();
		await user.click(screen.getByRole("button", { name: /^revoke$/i }));

		const dialog = screen.getByRole("alertdialog");
		const form = dialog.querySelector("form");
		expect(form).toBeTruthy();

		await user.click(
			within(dialog).getByRole("button", { name: /revoke assignment/i }),
		);

		await waitFor(() => {
			expect(screen.getByText("Revoking…")).toBeInTheDocument();
		});
		expect(form).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		first.resolve({
			ok: false,
			code: "FORBIDDEN",
			message: "Missing org.roles.manage permission.",
		} satisfies RevokeOrgRoleActionState);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Missing org.roles.manage permission.",
		);
		expect(form).toHaveAttribute("aria-busy", "false");
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});

	it("keeps empty assignment table without fake revoke CTA", () => {
		renderPanels({ assignments: [] });

		expect(screen.getByText("No role assignments yet")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^revoke$/i }),
		).not.toBeInTheDocument();
	});
});
