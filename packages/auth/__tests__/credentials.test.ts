import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const signInEmail = vi.fn();
const signOut = vi.fn();

vi.mock("../src/neon-auth", () => ({
	getNeonAuth: () => ({
		signIn: { email: signInEmail },
		signOut,
	}),
}));

describe("credential auth (Path A SDK)", () => {
	beforeEach(() => {
		signInEmail.mockReset();
		signOut.mockReset();
	});

	it("signInWithEmail returns ok when Neon has no error", async () => {
		signInEmail.mockResolvedValue({ data: {}, error: null });
		const { signInWithEmail } = await import("../src/credentials");
		await expect(
			signInWithEmail({ email: "a@b.c", password: "secret" }),
		).resolves.toEqual({ ok: true });
		expect(signInEmail).toHaveBeenCalledWith({
			email: "a@b.c",
			password: "secret",
		});
	});

	it("signInWithEmail maps Neon error message", async () => {
		signInEmail.mockResolvedValue({
			data: null,
			error: { message: "Invalid credentials", code: "INVALID" },
		});
		const { signInWithEmail } = await import("../src/credentials");
		await expect(
			signInWithEmail({ email: "a@b.c", password: "bad" }),
		).resolves.toEqual({
			ok: false,
			message: "Invalid credentials",
			code: "INVALID",
		});
	});

	it("signOutSession returns ok", async () => {
		signOut.mockResolvedValue({ data: {}, error: null });
		const { signOutSession } = await import("../src/credentials");
		await expect(signOutSession()).resolves.toEqual({ ok: true });
	});
});
