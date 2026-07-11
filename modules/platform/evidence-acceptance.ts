/** Shared evidence file acceptance — used by Declarations domain + product copy. */

export const MAX_EVIDENCE_BYTES = 1 * 1024 * 1024;

export const EVIDENCE_ACCEPTANCE = {
  maxBytes: MAX_EVIDENCE_BYTES,
  maxSizeLabel: "1 MB",
  format: "PDF",
  extension: ".pdf",
  mimeType: "application/pdf",
} as const;
