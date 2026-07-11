import { describe, expect, it } from "vitest";
import {
  parseDeclarationDraftJsonBody,
  parseDeclarationDraftQuery,
} from "@/modules/declarations/api/client-declaration-draft-route.logic";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("parseDeclarationDraftJsonBody", () => {
  it("rejects non-object bodies as BAD_REQUEST", () => {
    expect(parseDeclarationDraftJsonBody(null)).toEqual({
      ok: false,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid request",
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

  it("rejects invalid fields as VALIDATION_ERROR", () => {
    const result = parseDeclarationDraftJsonBody({ assignmentId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.code).toBe("VALIDATION_ERROR");
  });
});

describe("parseDeclarationDraftQuery", () => {
  it("parses assignmentId from search params", () => {
    expect(
      parseDeclarationDraftQuery(
        new URLSearchParams({ assignmentId }),
      ),
    ).toEqual({ ok: true, assignmentId });
  });

  it("rejects missing assignmentId", () => {
    const result = parseDeclarationDraftQuery(new URLSearchParams());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VALIDATION_ERROR");
  });
});
