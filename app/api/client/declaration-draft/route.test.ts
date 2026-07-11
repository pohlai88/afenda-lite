import { beforeEach, describe, expect, it, vi } from "vitest";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

vi.mock("server-only", () => ({}));

const mockGuardClientSession = vi.fn();
const mockPersistClientDeclarationDraft = vi.fn();
const mockLoadClientDeclarationDraft = vi.fn();

vi.mock("@/modules/identity/auth/session", () => ({
  guardClientSession: (...args: unknown[]) => mockGuardClientSession(...args),
}));

vi.mock("@/modules/declarations/domain/client-declaration-draft", () => ({
  persistClientDeclarationDraft: (...args: unknown[]) =>
    mockPersistClientDeclarationDraft(...args),
  loadClientDeclarationDraft: (...args: unknown[]) =>
    mockLoadClientDeclarationDraft(...args),
}));

vi.mock("@/modules/platform/observability", () => ({
  runLoggedAction: (_name: string, _userId: string | undefined, fn: () => unknown) =>
    fn(),
}));

import { GET, POST, PUT } from "@/app/api/client/declaration-draft/route";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("/api/client/declaration-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuardClientSession.mockResolvedValue({
      allowed: true,
      session: { user: { id: "u1", email: "c@ex.com", name: null } },
    });
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockGuardClientSession.mockResolvedValue({
      allowed: false,
      reason: "unauthenticated",
    });

    const response = await GET(
      new Request(
        `http://localhost/api/client/declaration-draft?assignmentId=${assignmentId}`,
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
    });
    expect(mockLoadClientDeclarationDraft).not.toHaveBeenCalled();
  });

  it("GET returns draft data envelope", async () => {
    mockLoadClientDeclarationDraft.mockResolvedValue({
      success: true,
      assignmentId,
      answers: { [questionId]: true },
      stepIndex: 2,
      savedAt: "2026-07-08T12:00:00.000Z",
    });

    const response = await GET(
      new Request(
        `http://localhost/api/client/declaration-draft?assignmentId=${assignmentId}`,
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        assignmentId,
        answers: { [questionId]: true },
        stepIndex: 2,
        savedAt: "2026-07-08T12:00:00.000Z",
      },
    });
  });

  it("PUT returns 403 for operator with contract error body", async () => {
    mockGuardClientSession.mockResolvedValue({
      allowed: false,
      reason: "organizationAdmin",
    });

    const response = await PUT(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "PUT",
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
      error: { code: "FORBIDDEN", message: "Forbidden" },
    });
  });

  it("PUT returns 400 for invalid JSON", async () => {
    const response = await PUT(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "BAD_REQUEST", message: "Invalid JSON" },
    });
    expect(mockPersistClientDeclarationDraft).not.toHaveBeenCalled();
  });

  it("PUT persists draft and returns data.savedAt", async () => {
    mockPersistClientDeclarationDraft.mockResolvedValue({
      success: true,
      savedAt: "2026-07-08T12:00:00.000Z",
    });

    const response = await PUT(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "PUT",
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
      data: { savedAt: "2026-07-08T12:00:00.000Z" },
    });
    expect(mockPersistClientDeclarationDraft).toHaveBeenCalledWith({
      assignmentId,
      answers: { [questionId]: true },
      stepIndex: 1,
      userId: "u1",
      userEmail: "c@ex.com",
    });
  });

  it("POST keepalive alias uses the same write path", async () => {
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
          stepIndex: 0,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPersistClientDeclarationDraft).toHaveBeenCalledOnce();
  });

  it("maps domain persist failures to contract error body", async () => {
    mockPersistClientDeclarationDraft.mockResolvedValue({
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
      status: 403,
    });

    const response = await PUT(
      new Request("http://localhost/api/client/declaration-draft", {
        method: "PUT",
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
      error: {
        code: "FORBIDDEN",
        message: portalCopy.clientDashboard.deadlineExpiredAssignment,
      },
    });
  });
});
