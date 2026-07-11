export {
  EVIDENCE_ACCEPTANCE,
  MAX_EVIDENCE_BYTES,
} from "@/modules/platform/evidence-acceptance";
import {
  EVIDENCE_ACCEPTANCE,
  MAX_EVIDENCE_BYTES,
} from "@/modules/platform/evidence-acceptance";

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  EVIDENCE_ACCEPTANCE.mimeType,
]);

export const EVIDENCE_FILE_INPUT_ACCEPT = `${EVIDENCE_ACCEPTANCE.mimeType},${EVIDENCE_ACCEPTANCE.extension}`;

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

  const lowerName = input.fileName.trim().toLowerCase();
  if (!lowerName.endsWith(EVIDENCE_ACCEPTANCE.extension)) {
    return { ok: false, reason: "extension" };
  }

  const mime = input.mimeType.trim().toLowerCase();
  if (mime && mime !== EVIDENCE_ACCEPTANCE.mimeType) {
    return { ok: false, reason: "mime" };
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
