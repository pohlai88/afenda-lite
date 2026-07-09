import { describe, expect, it } from "vitest";
import { parseDeclarationDraftJsonBody } from "@/lib/api/client-declaration-draft-route.logic";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("parseDeclarationDraftJsonBody", () => {
  it("rejects non-object bodies", () => {
    expect(parseDeclarationDraftJsonBody(null)).toEqual({
      ok: false,
      status: 400,
      error: "Invalid request",
    });
    expect(parseDeclarationDraftJsonBody("draft")).toEqual({
      ok: false,
      status: 400,
      error: "Invalid request",
    });
  });

  it("accepts valid draft payloads", () => {
    expect(
      parseDeclarationDraftJsonBody({
        assignmentId,
        answers: { [questionId]: true },
        stepIndex: 2,
      }),
    ).toEqual({
      ok: true,
      assignmentId,
      answers: { [questionId]: true },
      stepIndex: 2,
    });
  });

  it("rejects invalid assignmentId and missing fields via Zod", () => {
    expect(parseDeclarationDraftJsonBody({})).toEqual({
      ok: false,
      status: 400,
      error: expect.any(String),
    });
    expect(parseDeclarationDraftJsonBody({ assignmentId: "not-a-uuid" })).toEqual({
      ok: false,
      status: 400,
      error: expect.any(String),
    });
  });
});
