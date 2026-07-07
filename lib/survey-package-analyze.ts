import {
  cdpAssignmentSchema,
  cdpMetadataSchema,
  cdpQuestionSchema,
  parseCdpPackage,
  type CdpPackage,
} from "@/lib/survey-package";

export type DodCheckStatus = "pass" | "fail" | "warn" | "skip";

export type DodCheck = {
  id: string;
  label: string;
  status: DodCheckStatus;
  required: boolean;
  detail?: string;
};

export type PackageAnalysis = {
  valid: boolean;
  canIngest: boolean;
  confidence: number;
  blockingErrors: string[];
  warnings: string[];
  dodChecks: DodCheck[];
  summary: {
    title: string;
    questionCount: number;
    hasAssignment: boolean;
    assignmentEmail?: string;
    fileName?: string;
  };
  packageJson?: string;
};

export type IngestStepId =
  | "validate"
  | "metadata"
  | "declaration"
  | "assignment"
  | "finalize";

export type IngestStep = {
  id: IngestStepId;
  label: string;
  progress: number;
};

export const INGEST_STEPS: IngestStep[] = [
  { id: "validate", label: "Validate package", progress: 15 },
  { id: "metadata", label: "Apply case metadata", progress: 35 },
  { id: "declaration", label: "Apply declaration & questions", progress: 70 },
  { id: "assignment", label: "Create client assignment", progress: 90 },
  { id: "finalize", label: "Finalize & audit", progress: 100 },
];

function checkMetadataField(
  id: string,
  label: string,
  present: boolean,
  required = false,
): DodCheck {
  if (present) {
    return { id, label, status: "pass", required };
  }
  return {
    id,
    label,
    status: required ? "fail" : "warn",
    required,
    detail: required ? "Required for ingest." : "Recommended for audit trail.",
  };
}

function computeConfidence(pkg: CdpPackage, dodChecks: DodCheck[]): number {
  let score = 0;
  if (dodChecks.find((c) => c.id === "schema")?.status === "pass") score += 30;
  if (pkg.declaration.title.trim()) score += 10;
  if (pkg.declaration.questions.length > 0) score += 15;

  const meta = pkg.metadata ?? {};
  if (meta.referenceNumber || meta.caseNumber) score += 10;
  if (meta.surveyor?.name || meta.surveyor?.organization) score += 10;
  if (meta.surveyee?.individual || meta.surveyee?.organization) score += 10;
  if (meta.purpose?.trim()) score += 5;
  if (meta.submitBefore || pkg.assignment?.dueDate) score += 5;
  if (meta.categories && meta.categories.length > 0) score += 5;

  const blocking = dodChecks.filter((c) => c.required && c.status === "fail");
  if (blocking.length > 0) {
    return Math.min(score, 49);
  }

  return Math.min(100, score);
}

export function analyzeCdpPackageInput(input: {
  packageJson: string;
  fileName?: string;
}): PackageAnalysis {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  const dodChecks: DodCheck[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(input.packageJson);
  } catch {
    blockingErrors.push("invalid_json");
    dodChecks.push({
      id: "schema",
      label: "Valid CDP JSON (v1.0)",
      status: "fail",
      required: true,
      detail: "File is not valid JSON.",
    });
    return {
      valid: false,
      canIngest: false,
      confidence: 0,
      blockingErrors,
      warnings,
      dodChecks,
      summary: {
        title: "—",
        questionCount: 0,
        hasAssignment: false,
        fileName: input.fileName,
      },
      packageJson: input.packageJson,
    };
  }

  const parsed = parseCdpPackage(raw);
  if (!parsed.success) {
    blockingErrors.push("invalid_schema");
    dodChecks.push({
      id: "schema",
      label: "Valid CDP JSON (v1.0)",
      status: "fail",
      required: true,
      detail: "Missing cdpVersion, kind, or declaration structure.",
    });
    return {
      valid: false,
      canIngest: false,
      confidence: 0,
      blockingErrors,
      warnings,
      dodChecks,
      summary: {
        title: "—",
        questionCount: 0,
        hasAssignment: false,
        fileName: input.fileName,
      },
      packageJson: input.packageJson,
    };
  }

  const pkg = parsed.data;
  dodChecks.push({
    id: "schema",
    label: "Valid CDP JSON (v1.0)",
    status: "pass",
    required: true,
  });

  const titlePresent = Boolean(pkg.declaration.title.trim());
  dodChecks.push({
    id: "title",
    label: "Declaration title",
    status: titlePresent ? "pass" : "fail",
    required: true,
    detail: titlePresent ? undefined : "declaration.title is required.",
  });
  if (!titlePresent) blockingErrors.push("missing_title");

  const questionCount = pkg.declaration.questions.length;
  dodChecks.push({
    id: "questions",
    label: "At least one question",
    status: questionCount > 0 ? "pass" : "fail",
    required: true,
    detail: questionCount > 0 ? undefined : "Add questions under declaration.questions.",
  });
  if (questionCount === 0) blockingErrors.push("missing_questions");

  for (const [index, question] of pkg.declaration.questions.entries()) {
    const qParsed = cdpQuestionSchema.safeParse(question);
    if (!qParsed.success) {
      warnings.push(`question_${index + 1}_invalid`);
      dodChecks.push({
        id: `question-${index + 1}`,
        label: `Question ${index + 1} structure`,
        status: "fail",
        required: true,
        detail: "Each question needs prompt, type, and required flag.",
      });
      blockingErrors.push(`question_${index + 1}_invalid`);
      continue;
    }
    dodChecks.push({
      id: `question-${index + 1}`,
      label: `Question ${index + 1}: ${qParsed.data.prompt.slice(0, 40)}${qParsed.data.prompt.length > 40 ? "…" : ""}`,
      status: "pass",
      required: true,
    });

    if (qParsed.data.type === "text") {
      const { minLength, maxLength } = qParsed.data.config ?? {};
      if (
        minLength !== undefined &&
        maxLength !== undefined &&
        minLength > maxLength
      ) {
        warnings.push(`question_${index + 1}_length_bounds`);
        dodChecks.push({
          id: `question-${index + 1}-bounds`,
          label: `Question ${index + 1} length bounds`,
          status: "warn",
          required: false,
          detail: "minLength exceeds maxLength; clients may reject input.",
        });
      }
    }
  }

  const meta = pkg.metadata ?? {};
  dodChecks.push(
    checkMetadataField(
      "reference",
      "Reference or case number",
      Boolean(meta.referenceNumber || meta.caseNumber),
    ),
  );
  dodChecks.push(
    checkMetadataField(
      "surveyor",
      "Surveyor (principal)",
      Boolean(meta.surveyor?.name || meta.surveyor?.organization),
    ),
  );
  dodChecks.push(
    checkMetadataField(
      "surveyee",
      "Surveyee (declarant)",
      Boolean(meta.surveyee?.individual || meta.surveyee?.organization),
    ),
  );
  dodChecks.push(
    checkMetadataField("purpose", "Purpose", Boolean(meta.purpose?.trim())),
  );
  dodChecks.push(
    checkMetadataField(
      "deadline",
      "Submit-before or assignment due date",
      Boolean(meta.submitBefore || pkg.assignment?.dueDate),
    ),
  );
  dodChecks.push(
    checkMetadataField(
      "categories",
      "Categories",
      Boolean(meta.categories && meta.categories.length > 0),
    ),
  );

  if (pkg.assignment) {
    const assignmentParsed = cdpAssignmentSchema.safeParse(pkg.assignment);
    if (!assignmentParsed.success) {
      warnings.push("assignment_invalid");
      dodChecks.push({
        id: "assignment",
        label: "Client assignment block",
        status: "warn",
        required: false,
        detail: "assignment fields are malformed; assignment will be skipped.",
      });
    } else if (assignmentParsed.data.clientEmail) {
      dodChecks.push({
        id: "assignment",
        label: "Client assignment email",
        status: "pass",
        required: false,
        detail: assignmentParsed.data.clientEmail,
      });
    }
  } else {
    dodChecks.push({
      id: "assignment",
      label: "Client assignment block",
      status: "skip",
      required: false,
      detail: "No assignment in package.",
    });
  }

  const metaParsed = cdpMetadataSchema.safeParse(meta);
  if (!metaParsed.success) {
    warnings.push("metadata_partial");
  }

  for (const check of dodChecks) {
    if (check.status === "warn" && check.detail) {
      warnings.push(check.id);
    }
  }

  const confidence = computeConfidence(pkg, dodChecks);
  const canIngest = blockingErrors.length === 0;

  return {
    valid: true,
    canIngest,
    confidence,
    blockingErrors,
    warnings,
    dodChecks,
    summary: {
      title: pkg.declaration.title,
      questionCount,
      hasAssignment: Boolean(pkg.assignment?.clientEmail),
      assignmentEmail: pkg.assignment?.clientEmail,
      fileName: input.fileName,
    },
    packageJson: input.packageJson,
  };
}

export function confidenceLabel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}
