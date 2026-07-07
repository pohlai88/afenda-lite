import { describe, expect, it } from "vitest";
import {
  isEvidencePolicyFailureReason,
  validateEvidenceMetadata,
} from "@/lib/evidence-policy";

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

  it("rejects oversize files", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "large.pdf",
        mimeType: "application/pdf",
        sizeBytes: 11 * 1024 * 1024,
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

  it("rejects disallowed mime types", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "script.html",
        mimeType: "text/html",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: false, reason: "mime" });
  });

  it("rejects blocked extensions even with octet-stream mime", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "payload.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: false, reason: "extension" });
  });

  it("defaults empty mime to application/octet-stream", () => {
    expect(
      validateEvidenceMetadata({
        fileName: "notes.txt",
        mimeType: "  ",
        sizeBytes: 100,
      }),
    ).toEqual({ ok: true });
  });
});

describe("isEvidencePolicyFailureReason", () => {
  it("narrows known failure reasons", () => {
    expect(isEvidencePolicyFailureReason("mime")).toBe(true);
    expect(isEvidencePolicyFailureReason("unknown")).toBe(false);
  });
});
