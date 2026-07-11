import { describe, expect, it } from "vitest";
import {
  EVIDENCE_ACCEPTANCE,
  isEvidencePolicyFailureReason,
  validateEvidenceMetadata,
} from "@/modules/declarations/domain/evidence-policy";

describe("validateEvidenceMetadata", () => {
  it("accepts allowed PDF within size limit", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: true });
  });

  it("accepts PDF with empty mime when extension is .pdf", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "report.pdf",
        mimeType: "  ",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects oversize PDFs", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "large.pdf",
        mimeType: "application/pdf",
        sizeBytes: EVIDENCE_ACCEPTANCE.maxBytes + 1,
      }),
    ).toEqual({ ok: false, reason: "size" });
  });

  it("rejects negative size", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "bad.pdf",
        mimeType: "application/pdf",
        sizeBytes: -1,
      }),
    ).toEqual({ ok: false, reason: "size" });
  });

  it("rejects non-PDF mime types", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: false, reason: "extension" });
  });

  it("rejects non-PDF extensions even with PDF mime", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "notes.txt",
        mimeType: "application/pdf",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: false, reason: "extension" });
  });

  it("rejects wrong mime on PDF extension", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "report.pdf",
        mimeType: "text/html",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: false, reason: "mime" });
  });
});

describe("isEvidencePolicyFailureReason", () => {
  it("narrows known failure reasons", () => {
    expect(isEvidencePolicyFailureReason("mime")).toBe(true);
    expect(isEvidencePolicyFailureReason("unknown")).toBe(false);
  });
});

describe("portalCopy.declarationForm.filePolicyError", () => {
  it("returns specific messages for each policy failure", async () => {
    const { portalCopy } = await import("@/modules/platform/copy/portal-copy");
    expect(portalCopy.declarationForm.filePolicyError("size")).toContain(
      EVIDENCE_ACCEPTANCE.maxSizeLabel,
    );
    expect(portalCopy.declarationForm.filePolicyError("mime")).toContain("PDF");
    expect(portalCopy.declarationForm.filePolicyError("extension")).toContain(
      ".pdf",
    );
  });
});
