import {
  CDP_PACKAGE_VERSION,
  createCdpStarterTemplate,
  serializeCdpPackage,
} from "@/lib/domain/survey-package";

/** Copy-paste prompt for ChatGPT, Claude, etc. to customize a CDP declaration package. */
export function buildCdpAiAssistantPrompt(): string {
  const templateJson = serializeCdpPackage(createCdpStarterTemplate());

  return `You are helping me produce a Client Declaration Portal (CDP) package — a single JSON file I will upload to my declaration portal.

## Your output
- Return ONLY valid JSON (no markdown fences, no comments, no trailing prose).
- Keep \`cdpVersion\` as "${CDP_PACKAGE_VERSION}" and \`kind\` as "declaration-package".
- Preserve the overall structure of the starter template below.

## Required fields (ingest will fail without these)
- \`declaration.title\` — non-empty string
- \`declaration.questions\` — at least one question
- Each question: \`prompt\`, \`type\` (yes_no | text | file), \`required\` (boolean)

## Recommended audit metadata (fill with real values, not placeholders)
- \`metadata.referenceNumber\` or \`metadata.caseNumber\`
- \`metadata.surveyor.name\` or \`metadata.surveyor.organization\` (principal / reviewer)
- \`metadata.surveyee.individual\` or \`metadata.surveyee.organization\` (declarant)
- \`metadata.purpose\`
- \`metadata.submitBefore\` (ISO datetime) or \`assignment.dueDate\` (YYYY-MM-DD)
- \`metadata.categories\` — array of labels, e.g. ["KYC", "compliance"]
- \`metadata.effectiveDate\` — YYYY-MM-DD

## Question types
- \`yes_no\` — confirmation or attestation; optional \`config.helpText\`
- \`text\` — free text; optional \`config.placeholder\`, \`config.minLength\`, \`config.maxLength\`, \`config.helpText\`
- \`file\` — client uploads evidence; optional \`config.helpText\`

## Optional client assignment block
- \`assignment.clientEmail\` — email to invite
- \`assignment.dueDate\` — YYYY-MM-DD

## Starter template (replace ALL example names, emails, and prompts)
${templateJson}

## My case details
[Describe your declaration here: case reference, surveyor, surveyee, purpose, deadline, and the questions you need. I will fill this section before sending, or answer your follow-up questions.]

## Task
1. Replace every example/placeholder value in the starter template with my real case details.
2. Write clear, professional question prompts suitable for a legal/compliance declaration.
3. Number questions logically in the array order (portal displays them sequentially).
4. Output the complete updated JSON only.`;
}
