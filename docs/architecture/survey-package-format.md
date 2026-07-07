# CDP Declaration Package — format & decision record

| Field | Value |
|-------|-------|
| **Status** | adopted |
| **Version** | `1.0` |
| **Media type** | `application/json` |
| **Filename convention** | `cdp-declaration-{id-prefix}.json` |

## Purpose

Provide a **single interchange format** for operator tooling, AI-assisted generation, and client assignment setup. The package mirrors the same fields used in:

- `surveys` metadata (operator declaration detail)
- `survey_questions` (+ optional `config` JSONB)
- `client_assignments` (`client_email`, `due_date`)

This reduces drift between “declaration definition” and “client delivery”.

## Decision matrix

Evaluated interchange options (Context7 / Google Forms API patterns; no GitHub MCP available in this workspace session).

| Criterion (weight) | CDP JSON v1 | YAML | Google Forms API shape | CSV |
|--------------------|------------|------|------------------------|-----|
| Mirrors DB + assignment (×3) | **5** | 5 | 2 | 1 |
| AI / LLM parse & emit (×2) | **4** | 4 | 2 | 3 |
| Human diff in PRs (×1) | 4 | **5** | 2 | 3 |
| Zero new runtime deps (×2) | **5** | 3 | 4 | 5 |
| Zod validation in-app (×2) | **5** | 5 | 3 | 2 |
| Question advanced config (×2) | **4** | 4 | **5** | 1 |
| **Weighted score** | **43** | 41 | 27 | 24 |

**Decision:** adopt **CDP JSON v1** (`kind: declaration-package`, `cdpVersion: "1.0"`).

**Rationale:**

1. JSON is native to the stack (Zod, server actions, browser upload) — no YAML parser.
2. Structure intentionally parallels Google Forms `info` + `items[]` + `required` but stays minimal for current question types (`yes_no`, `text`, `file`).
3. Optional `assignment` block aligns with S7 client assignments so import can create a pending assignment in one step.
4. Per-question `config` holds advanced settings (help text, placeholder, length bounds) without breaking the simple editor defaults.

## Schema (normative)

```json
{
  "cdpVersion": "1.0",
  "kind": "declaration-package",
  "metadata": {
    "referenceNumber": "REF-2026-001",
    "caseNumber": "CASE-42",
    "effectiveDate": "2026-07-07",
    "submitBefore": "2026-08-07T23:59:59.000Z",
    "surveyor": {
      "name": "Jane Reviewer",
      "organization": "Acme Compliance Ltd"
    },
    "surveyee": {
      "individual": "Alex Morgan",
      "organization": "Morgan Holdings Pte Ltd"
    },
    "purpose": "Annual KYC refresh for corporate declarant.",
    "categories": ["KYC", "compliance"]
  },
  "declaration": {
    "title": "Q2 service declaration",
    "intro": "Brief context shown above the questions.",
    "questions": [
      {
        "prompt": "Do you confirm the information provided is accurate?",
        "type": "yes_no",
        "required": true,
        "config": {
          "helpText": "Answer based on records as of the effective date."
        }
      },
      {
        "prompt": "Describe your relationship or business context.",
        "type": "text",
        "required": true,
        "config": {
          "placeholder": "Enter your response…",
          "minLength": 10,
          "maxLength": 2000
        }
      }
    ]
  },
  "assignment": {
    "clientEmail": "client@example.com",
    "dueDate": "2026-08-07"
  }
}
```

## Implementation map

| Package path | Database |
|--------------|----------|
| `metadata.*` | `surveys` columns (`reference_number`, `case_number`, …) |
| `declaration.title` / `intro` | `surveys.title` / `surveys.question` |
| `declaration.questions[]` | `survey_questions` (+ `config` JSONB) |
| `assignment.clientEmail` / `dueDate` | `client_assignments` (optional on import) |

## Code owners

- Zod schema & serialize/parse: `lib/survey-package.ts`
- Import/export actions: `app/actions/surveys.ts`
- Operator UI: `components/survey-metadata-*`, `components/survey-package-panel.tsx`
- Migration: `db/migrations/007_survey_metadata.sql`

## Operator ingest UX (v1)

Upload is **two-phase** — selecting a file does **not** apply changes immediately:

1. **Select** — client-side validation + DoD checklist + confidence score
2. **Review dialog** — operator confirms blocking/recommended items
3. **Start ingest** — server applies metadata, declaration, questions, optional assignment
4. **Progress** — staged step list with % progress during ingest

Minimum **Definition of Done** (blocking):

- Valid CDP JSON v1 schema
- Declaration title
- At least one valid question

Recommended fields (warnings, affect confidence %): reference/case, surveyor, surveyee, purpose, deadline, categories.


- JSON Schema file published beside this doc for external tooling
- Optional YAML export (same object graph)
- AI ingest endpoint accepting CDP JSON with dry-run validation
- Additional question kinds aligned with Google Forms (`choiceQuestion`, `dateQuestion`) when product requires them
