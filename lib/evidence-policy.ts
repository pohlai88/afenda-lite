export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/octet-stream",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".dll",
  ".scr",
  ".js",
  ".vbs",
  ".ps1",
]);

export function validateEvidenceMetadata(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}):
  | { ok: true }
  | { ok: false; reason: "size" | "mime" | "extension" } {
  if (input.sizeBytes < 0 || input.sizeBytes > MAX_EVIDENCE_BYTES) {
    return { ok: false, reason: "size" };
  }

  const mime = input.mimeType.trim().toLowerCase() || "application/octet-stream";
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(mime)) {
    return { ok: false, reason: "mime" };
  }

  const lowerName = input.fileName.trim().toLowerCase();
  const extension = lowerName.includes(".")
    ? lowerName.slice(lowerName.lastIndexOf("."))
    : "";

  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: "extension" };
  }

  return { ok: true };
}

export const EVIDENCE_POLICY_FAILURE_REASONS = new Set([
  "size",
  "mime",
  "extension",
] as const);

export type EvidencePolicyFailureReason = "size" | "mime" | "extension";

export function isEvidencePolicyFailureReason(
  value: string,
): value is EvidencePolicyFailureReason {
  return EVIDENCE_POLICY_FAILURE_REASONS.has(
    value as EvidencePolicyFailureReason,
  );
}
