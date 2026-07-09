import {
  formNumberField,
  formString,
} from "@/lib/server-actions/form-data";

/** FormData → raw object for `registerEvidenceSchema` parsing. */
export function readRegisterEvidenceFromFormData(formData: FormData) {
  return {
    surveyId: formString(formData, "surveyId"),
    slug: formString(formData, "slug"),
    questionId: formString(formData, "questionId"),
    fileName: formString(formData, "fileName"),
    mimeType: formString(formData, "mimeType"),
    sizeBytes: formNumberField(formData, "sizeBytes"),
  };
}
