import { beforeEach, describe, expect, it, vi } from "vitest";
import { portalCopy } from "@/lib/portal-copy";

vi.mock("server-only", () => ({}));

const mockGetAuthSession = vi.fn();
const mockToClientAuthenticatedSession = vi.fn();
const mockPersistClientDeclarationDraft = vi.fn();

vi.mock("@/lib/auth/get-session", () => ({
  getAuthSession: () => mockGetAuthSession(),
}));

vi.mock("@/lib/client-session", () => ({
  toClientAuthenticatedSession: (session: unknown) =>
    mockToClientAuthenticatedSession(session),
}));

vi.mock("@/lib/client-declaration-draft", () => ({
  persistClientDeclarationDraft: (...args: unknown[]) =>
    mockPersistClientDeclarationDraft(...args),
}));

import { POST } from "@/app/api/client/declaration-draft/route";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("POST /api/client/declaration-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthSession.mockResolvedValue({ user: { id: "u1", email: "c@ex.com" } });
    mockToClientAuthenticatedSession.mockReturnValue({
      user: { id: "u1", email: "c@ex.com" },
    });
  });

  it("returns 401 when the client session is missing", async () => {
    mockToClientAuthenticatedSession.mockReturnValue(null);

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
