import { describe, expect, it } from "vitest";
import { readRegisterEvidenceFromFormData } from "@/lib/server-actions/register-evidence-form";

describe("readRegisterEvidenceFromFormData", () => {
  it("maps evidence upload fields for schema parsing", () => {
    const formData = new FormData();
    formData.set("surveyId", " 550e8400-e29b-41d4-a716-446655440000 ");
    formData.set("slug", " annual-review ");
    formData.set("questionId", "550e8400-e29b-41d4-a716-446655440003");
    formData.set("fileName", " report.pdf ");
    formData.set("mimeType", " application/pdf ");
    formData.set("sizeBytes", "4096");

    expect(readRegisterEvidenceFromFormData(formData)).toEqual({
      surveyId: "550e8400-e29b-41d4-a716-446655440000",
      slug: "annual-review",
      questionId: "550e8400-e29b-41d4-a716-446655440003",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: "4096",
    });
  });

  it("defaults sizeBytes when absent", () => {
    const formData = new FormData();

    expect(readRegisterEvidenceFromFormData(formData).sizeBytes).toBe(0);
  });
});
