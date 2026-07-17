import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignOrgRoleActionState } from "@/app/actions/assign-org-role";
import {
	AssignOrgRoleForm,
	type MemberDirectoryState,
} from "@/features/org-admin/assign-org-role-form";

const { assignOrgRoleAction } = vi.hoisted(() => ({
	assignOrgRoleAction: vi.fn(),
}));

vi.mock("@/app/actions/assign-org-role", () => ({
	assignOrgRoleAction,
}));

const ROLES = [
	{ id: "11111111-1111-4111-8111-111111111111", name: "Org Admin" },
	{ id: "22222222-2222-4222-8222-222222222222", name: "Operator" },
] as const;

const DEFAULT_ROLE_ID = ROLES[0].id;

const READY_DIRECTORY: MemberDirectoryState = {
	status: "ready",
	options: [
		{ id: "user_neon_abc", label: "Ada Lovelace · ada@example.com" },
		{ id: "user_neon_def", label: "Grace Hopper · grace@example.com" },
	],
};

function deferredAction(): {
	promise: Promise<AssignOrgRoleActionState>;
	resolve: (value: AssignOrgRoleActionState) => void;
} {
	let resolve!: (value: AssignOrgRoleActionState) => void;
	const promise = new Promise<AssignOrgRoleActionState>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function successState(
	assignmentId: string,
	auditId: string,
): AssignOrgRoleActionState {
	return {
		ok: true,
		data: {
			assignmentId,
			userId: "user_neon_abc",
			roleId: DEFAULT_ROLE_ID,
			reactivated: false,
			auditId,
		},
	};
}

async function selectMember(
	user: ReturnType<typeof userEvent.setup>,
	label: string,
) {
	const combobox = screen.getByRole("combobox", {
		name: "Organization member",
	});
	await user.click(combobox);
	await user.click(await screen.findByText(label));
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	assignOrgRoleAction.mockReset();
});

describe("AssignOrgRoleForm — member picker STABILITY", () => {
	it("empty roles Alert is non-assertive status", () => {
		render(<AssignOrgRoleForm roles={[]} memberDirectory={READY_DIRECTORY} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Assignment unavailable");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows empty and unavailable member directory Alerts", () => {
		const { rerender } = render(
			<AssignOrgRoleForm
				roles={ROLES}
				memberDirectory={{ status: "empty", options: [] }}
			/>,
		);
		expect(screen.getByRole("status")).toHaveTextContent(
			"No organization members",
		);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

		rerender(
			<AssignOrgRoleForm
				roles={ROLES}
				memberDirectory={{ status: "unavailable", options: [] }}
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Member directory unavailable",
		);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	it("keeps a stable accessible name and submits hidden userId", async () => {
		const user = userEvent.setup();
		assignOrgRoleAction.mockResolvedValue(successState("asg_1", "aud_1"));

		const { container } = render(
			<AssignOrgRoleForm roles={ROLES} memberDirectory={READY_DIRECTORY} />,
		);

		const combobox = screen.getByRole("combobox", {
			name: "Organization member",
		});
		expect(combobox).toHaveAttribute("aria-label", "Organization member");

		await selectMember(user, "Ada Lovelace · ada@example.com");
		expect(
			screen.getByRole("combobox", { name: "Organization member" }),
		).toBeInTheDocument();

		const hidden = container.querySelector(
			'input[type="hidden"][name="userId"]',
		);
		expect(hidden).toHaveAttribute("value", "user_neon_abc");

		await user.click(screen.getByRole("button", { name: /assign role/i }));

		await waitFor(() => {
			expect(assignOrgRoleAction).toHaveBeenCalled();
		});
		const formData = assignOrgRoleAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("userId")).toBe("user_neon_abc");
		expect(formData.get("roleId")).toBe(DEFAULT_ROLE_ID);
	});

	it("filters members by search text", async () => {
		const user = userEvent.setup();
		render(
			<AssignOrgRoleForm roles={ROLES} memberDirectory={READY_DIRECTORY} />,
		);

		await user.click(
			screen.getByRole("combobox", { name: "Organization member" }),
		);
		const search = screen.getByPlaceholderText("Search members…");
		await user.type(search, "grace");

		const listbox = screen.getByRole("listbox");
		expect(
			within(listbox).getByText("Grace Hopper · grace@example.com"),
		).toBeInTheDocument();
		expect(
			within(listbox).queryByText("Ada Lovelace · ada@example.com"),
		).not.toBeInTheDocument();
	});

	it("hides success while pending, shows it after resolve, and resets selection", async () => {
		const user = userEvent.setup();
		const first = deferredAction();
		assignOrgRoleAction.mockImplementation(() => first.promise);

		const { container } = render(
			<AssignOrgRoleForm roles={ROLES} memberDirectory={READY_DIRECTORY} />,
		);
		const form = container.querySelector("form");
		expect(form).toBeTruthy();

		await selectMember(user, "Ada Lovelace · ada@example.com");
		await user.click(screen.getByRole("button", { name: /assign role/i }));

		await waitFor(() => {
			expect(screen.getByText("Assigning role…")).toBeInTheDocument();
		});
		expect(form).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByText("Role assigned")).not.toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "Organization member" }),
		).toBeDisabled();

		first.resolve(successState("asg_1", "aud_1"));

		await waitFor(() => {
			expect(screen.getByText("Role assigned")).toBeInTheDocument();
		});
		expect(form).toHaveAttribute("aria-busy", "false");
		expect(
			container.querySelector('input[type="hidden"][name="userId"]'),
		).toHaveAttribute("value", "");
		expect(screen.getByRole("button", { name: /assign role/i })).toBeDisabled();
	});

	it("shows FormError on non-field failure", async () => {
		const user = userEvent.setup();
		assignOrgRoleAction.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Missing org.roles.manage permission.",
		} satisfies AssignOrgRoleActionState);

		render(
			<AssignOrgRoleForm roles={ROLES} memberDirectory={READY_DIRECTORY} />,
		);

		await selectMember(user, "Ada Lovelace · ada@example.com");
		await user.click(screen.getByRole("button", { name: /assign role/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Missing org.roles.manage permission.",
		);
	});
});
