import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AttendanceControl } from "@/features/human-resources/attendance-control";

const { recordOwnAttendanceAction } = vi.hoisted(() => ({
	recordOwnAttendanceAction: vi.fn(),
}));

vi.mock("@/app/actions/hr-self-service", () => ({
	recordOwnAttendanceAction,
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	recordOwnAttendanceAction.mockReset();
});

describe("AttendanceControl accessibility and interaction", () => {
	it("exposes all attendance events as keyboard-operable submit buttons", () => {
		const { container } = render(
			<AttendanceControl timeZone="Asia/Kuala_Lumpur" />,
		);

		expect(
			screen.getByRole("button", { name: "Clock in" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start break" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "End break" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Clock out" }),
		).toBeInTheDocument();
		expect(container.querySelector("form")).toHaveAttribute(
			"aria-busy",
			"false",
		);
	});

	it("submits the selected event and allow-listed timezone", async () => {
		recordOwnAttendanceAction.mockResolvedValue({
			ok: true,
			data: { eventId: "event-1", eventType: "clock-in" },
		});
		const user = userEvent.setup();
		render(<AttendanceControl timeZone="Asia/Kuala_Lumpur" />);

		await user.click(screen.getByRole("button", { name: "Clock in" }));

		await waitFor(() => {
			expect(recordOwnAttendanceAction).toHaveBeenCalled();
		});
		const formData = recordOwnAttendanceAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("eventType")).toBe("clock-in");
		expect(formData.get("timeZone")).toBe("Asia/Kuala_Lumpur");
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Attendance recorded",
		);
	});

	it("announces a safe failure without exposing internal details", async () => {
		recordOwnAttendanceAction.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Could not record attendance. Retry or contact HR.",
			details: { correlationId: "corr-safe" },
		});
		const user = userEvent.setup();
		render(<AttendanceControl timeZone="UTC" />);

		await user.click(screen.getByRole("button", { name: "Clock out" }));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"Could not record attendance. Retry or contact HR.",
		);
		expect(alert).not.toHaveTextContent("corr-safe");
	});
});
