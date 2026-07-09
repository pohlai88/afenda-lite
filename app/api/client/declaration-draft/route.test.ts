import { beforeEach, describe, expect, it, vi } from "vitest";
import { portalCopy } from "@/lib/portal-copy";

vi.mock("server-only", () => ({}));

const mockGuardClientSession = vi.fn();
const mockPersistClientDeclarationDraft = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  guardClientSession: (...args: unknown[]) => mockGuardClientSession(...args),
}));

vi.mock("@/lib/client-declaration-draft", () => ({
  persistClientDeclarationDraft: (...args: unknown[]) =>
    mockPersistClientDeclarationDraft(...args),
}));

vi.mock("@/lib/observability", () => ({
  runLoggedAction: (_name: string, _userId: string | undefined, fn: () => unknown) =>
    fn(),
}));

import { POST } from "@/app/api/client/declaration-draft/route";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("POST /api/client/declaration-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuardClientSession.mockResolvedValue({
      allowed: true,
      session: { user: { id: "u1", email: "c@ex.com", name: null } },
    });
  });

  it("returns 401 when the client session guard rejects unauthenticated access", async () => {
    mockGuardClientSession.mockResolvedValue({
      allowed: false,
      reason: "unauthenticated",
    });

    const response = await POST(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: { [questionId]: true },
          stepIndex: 0,
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockPersistClientDeclarationDraft).not.toHaveBeenCalled();
    expect(mockGuardClientSession).toHaveBeenCalledWith({
      requireOnboarding: true,
    });
  });

  it("returns 403 when an operator session hits the client draft API", async () => {
    mockGuardClientSession.mockResolvedValue({
      allowed: false,
      reason: "operator",
    });

    const response = await POST(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: { [questionId]: true },
          stepIndex: 0,
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPersistClientDeclarationDraft).not.toHaveBeenCalled();
  });

  it("delegates to persistClientDeclarationDraft and returns savedAt", async () => {
    mockPersistClientDeclarationDraft.mockResolvedValue({
      success: true,
      savedAt: "2026-07-08T12:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: { [questionId]: true },
          stepIndex: 1,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      savedAt: "2026-07-08T12:00:00.000Z",
    });
    expect(mockPersistClientDeclarationDraft).toHaveBeenCalledWith({
      assignmentId,
      answers: { [questionId]: true },
      stepIndex: 1,
      userId: "u1",
      userEmail: "c@ex.com",
    });
  });

  it("returns persist error status from shared draft helper", async () => {
    mockPersistClientDeclarationDraft.mockResolvedValue({
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
      status: 403,
    });

    const response = await POST(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: { [questionId]: true },
          stepIndex: 0,
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
    });
  });
});
