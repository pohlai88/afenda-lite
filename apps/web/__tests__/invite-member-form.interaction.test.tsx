import {
	cleanup,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InviteOrgMemberActionState } from "@/app/actions/invite-org-member";
import { InviteMemberForm } from "@/features/org-admin/invite-member-form";

const { inviteOrgMemberAction } = vi.hoisted(() => ({
	inviteOrgMemberAction: vi.fn(),
}));

vi.mock("@/app/actions/invite-org-member", () => ({
	inviteOrgMemberAction,
}));

const INVITEABLE_ROLES = ["client", "operator"] as const;
const JOIN_PATH = "/join";

function deferredAction(): {
	promise: Promise<InviteOrgMemberActionState>;
	resolve: (value: InviteOrgMemberActionState) => void;
} {
	let resolve!: (value: InviteOrgMemberActionState) => void;
	const promise = new Promise<InviteOrgMemberActionState>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function successState(
	email: string,
	auditId: string,
	joinUrl: string | null,
): InviteOrgMemberActionState {
	return {
		ok: true,
		data: { email, auditId, joinUrl },
	};
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	inviteOrgMemberAction.mockReset();
});

describe("InviteMemberForm — invite STABILITY", () => {
	it("empty inviteable roles Alert is non-assertive status", () => {
		render(<InviteMemberForm inviteableRoles={[]} joinPath={JOIN_PATH} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Invitations unavailable");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("submits email and default client role", async () => {
		const user = userEvent.setup();
		inviteOrgMemberAction.mockResolvedValue(
			successState("ada@example.com", "aud_1", "/join?invitationId=inv_1"),
		);

		render(
			<InviteMemberForm
				inviteableRoles={[...INVITEABLE_ROLES]}
				joinPath={JOIN_PATH}
			/>,
		);

		await user.type(screen.getByLabelText(/email/i), "ada@example.com");
		await user.click(screen.getByRole("button", { name: /send invitation/i }));

		await waitFor(() => {
			expect(inviteOrgMemberAction).toHaveBeenCalled();
		});
		const formData = inviteOrgMemberAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("email")).toBe("ada@example.com");
		expect(formData.get("role")).toBe("client");
	});

	it("hides success while pending, shows join link after resolve", async () => {
		const user = userEvent.setup();
		const first = deferredAction();
		inviteOrgMemberAction.mockImplementation(() => first.promise);

		const { container } = render(
			<InviteMemberForm
				inviteableRoles={[...INVITEABLE_ROLES]}
				joinPath={JOIN_PATH}
			/>,
		);
		const form = container.querySelector("form");
		expect(form).toBeTruthy();

		await user.type(screen.getByLabelText(/email/i), "ada@example.com");
		await user.click(screen.getByRole("button", { name: /send invitation/i }));

		await waitFor(() => {
			expect(screen.getByText("Sending invitation…")).toBeInTheDocument();
		});
		expect(form).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByText("Invitation sent")).not.toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeDisabled();

		first.resolve(
			successState("ada@example.com", "aud_1", "/join?invitationId=inv_1"),
		);

		await waitFor(() => {
			expect(screen.getByText("Invitation sent")).toBeInTheDocument();
		});
		expect(form).toHaveAttribute("aria-busy", "false");
		expect(screen.getByTestId("invite-join-url")).toHaveAttribute(
			"href",
			"/join?invitationId=inv_1",
		);
	});

	it("falls back to join-path copy when invitation id is absent", async () => {
		const user = userEvent.setup();
		inviteOrgMemberAction.mockResolvedValue(
			successState("ada@example.com", "aud_2", null),
		);

		render(
			<InviteMemberForm
				inviteableRoles={[...INVITEABLE_ROLES]}
				joinPath={JOIN_PATH}
			/>,
		);

		await user.type(screen.getByLabelText(/email/i), "ada@example.com");
		await user.click(screen.getByRole("button", { name: /send invitation/i }));

		expect(await screen.findByText("Invitation sent")).toBeInTheDocument();
		expect(screen.getByText(/\/join\?invitationId=…/)).toBeInTheDocument();
		expect(screen.queryByTestId("invite-join-url")).not.toBeInTheDocument();
	});

	it("shows FormError on non-field failure", async () => {
		const user = userEvent.setup();
		inviteOrgMemberAction.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Missing clients.invite permission.",
		} satisfies InviteOrgMemberActionState);

		render(
			<InviteMemberForm
				inviteableRoles={[...INVITEABLE_ROLES]}
				joinPath={JOIN_PATH}
			/>,
		);

		await user.type(screen.getByLabelText(/email/i), "ada@example.com");
		await user.click(screen.getByRole("button", { name: /send invitation/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Missing clients.invite permission.",
		);
	});

	it("surfaces field validation on the email FormField", async () => {
		const user = userEvent.setup();
		inviteOrgMemberAction.mockResolvedValue({
			ok: false,
			code: "VALIDATION_ERROR",
			message: "Enter a valid email and membership role.",
			details: { fieldErrors: { email: ["Invalid email"] } },
		} satisfies InviteOrgMemberActionState);

		render(
			<InviteMemberForm
				inviteableRoles={[...INVITEABLE_ROLES]}
				joinPath={JOIN_PATH}
			/>,
		);

		await user.type(screen.getByLabelText(/email/i), "ada@example.com");
		await user.click(screen.getByRole("button", { name: /send invitation/i }));

		expect(await screen.findByText("Invalid email")).toBeInTheDocument();
		expect(
			screen.queryByText("Enter a valid email and membership role."),
		).not.toBeInTheDocument();
	});
});
