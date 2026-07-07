import { describe, expect, it } from "vitest";
import { getDeclarationDeadlineError } from "@/lib/declaration-deadlines";

describe("getDeclarationDeadlineError", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("returns null when no deadlines are set", () => {
    expect(
      getDeclarationDeadlineError({
        dueDate: null,
        submitBefore: null,
        now,
      }),
    ).toBeNull();
  });

  it("returns assignment when due date has passed", () => {
    expect(
      getDeclarationDeadlineError({
        dueDate: new Date("2026-07-07T12:00:00.000Z"),
        submitBefore: null,
        now,
      }),
    ).toBe("assignment");
  });

  it("returns declaration when submit_before has passed", () => {
    expect(
      getDeclarationDeadlineError({
        dueDate: null,
        submitBefore: new Date("2026-07-07T12:00:00.000Z"),
        now,
      }),
    ).toBe("declaration");
  });

  it("prefers assignment deadline when both are expired", () => {
    expect(
      getDeclarationDeadlineError({
        dueDate: new Date("2026-07-07T10:00:00.000Z"),
        submitBefore: new Date("2026-07-07T11:00:00.000Z"),
        now,
      }),
    ).toBe("assignment");
  });

  it("returns null when deadlines are in the future", () => {
    expect(
      getDeclarationDeadlineError({
        dueDate: new Date("2026-07-09T12:00:00.000Z"),
        submitBefore: new Date("2026-07-10T12:00:00.000Z"),
        now,
      }),
    ).toBeNull();
  });
});
