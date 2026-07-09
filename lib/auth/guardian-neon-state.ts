import type { GuardianState } from "@/components/auth/types";

export type NeonFeedbackKind = "error" | "warning" | "locked" | "success";

export type NeonAccessPanelSignals = {
  sessionPending: boolean;
  neonMounted: boolean;
  formLoading: boolean;
  hasFocusedField: boolean;
  feedbackKind: NeonFeedbackKind | null;
};

const LOCKED_PATTERNS = [
  /\blocked\b/i,
  /\blockout\b/i,
  /too many attempts/i,
  /rate limit/i,
  /\bblocked\b/i,
  /\bsuspended\b/i,
];

const WARNING_PATTERNS = [
  /\bwarning\b/i,
  /\bverify\b/i,
  /verification required/i,
  /try again later/i,
  /\bexpired\b/i,
  /attempt/i,
];

export function classifyNeonFeedbackMessage(
  message: string,
): NeonFeedbackKind {
  const normalized = message.trim();
  if (!normalized) return "error";

  if (LOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "locked";
  }

  if (WARNING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "warning";
  }

  return "error";
}

export function mergeNeonFeedbackKinds(
  kinds: NeonFeedbackKind[],
): NeonFeedbackKind | null {
  if (kinds.length === 0) return null;

  const priority: NeonFeedbackKind[] = [
    "success",
    "locked",
    "warning",
    "error",
  ];

  for (const kind of priority) {
    if (kinds.includes(kind)) return kind;
  }

  return kinds[0] ?? null;
}

export function inferGuardianStateFromNeonSignals(
  signals: NeonAccessPanelSignals,
): GuardianState {
  if (signals.sessionPending || !signals.neonMounted || signals.formLoading) {
    return "loading";
  }

  if (signals.feedbackKind === "success") return "success";
  if (signals.feedbackKind === "locked") return "locked";
  if (signals.feedbackKind === "warning") return "warning";
  if (signals.feedbackKind === "error") return "error";
  if (signals.hasFocusedField) return "typing";

  return "idle";
}

function readTextMessages(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)]
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
}

function readToastMessages(): { text: string; kind: NeonFeedbackKind }[] {
  const toasts = document.querySelectorAll("[data-sonner-toast]");

  return [...toasts].flatMap((toast) => {
    const text = toast.textContent?.trim() ?? "";
    if (!text) return [];

    const type = toast.getAttribute("data-type");
    if (type === "success") return [{ text, kind: "success" as const }];
    if (type === "warning") return [{ text, kind: "warning" as const }];

    return [{ text, kind: classifyNeonFeedbackMessage(text) }];
  });
}

function isNeonFormLoading(card: ParentNode): boolean {
  if (card.querySelector('[aria-busy="true"], .animate-spin')) {
    return true;
  }

  const fields = card.querySelectorAll(
    'input:not([type="hidden"]), textarea, select',
  );
  if (
    fields.length > 0 &&
    [...fields].every((field) => field.hasAttribute("disabled"))
  ) {
    return true;
  }

  const submit = card.querySelector('button[type="submit"]');
  return Boolean(
    submit instanceof HTMLButtonElement &&
      submit.disabled &&
      submit.querySelector("svg"),
  );
}

function isNeonMounted(panel: ParentNode): boolean {
  return Boolean(
    panel.querySelector(
      ".portal-neon-view .bg-card, .portal-neon-view form, .portal-neon-view [data-slot]",
    ),
  );
}

/** DOM snapshot for Guardian cinematic state — scoped to the access panel root. */
export function collectNeonAccessPanelSignals(
  panel: ParentNode,
  options: { sessionPending?: boolean } = {},
): NeonAccessPanelSignals {
  const sessionPending = options.sessionPending ?? false;
  const neonMounted = isNeonMounted(panel);
  const card = panel.querySelector(".bg-card") ?? panel;
  const formLoading = neonMounted ? isNeonFormLoading(card) : false;

  const active = document.activeElement;
  const hasFocusedField =
    active instanceof HTMLElement &&
    panel.contains(active) &&
    active.matches("input, textarea, select");

  const inlineMessages = [
    ...readTextMessages(
      panel,
      '[role="alert"], [data-slot="form-message"], .text-destructive',
    ),
    ...readTextMessages(panel, '[data-slot="field-message"]'),
  ];

  const toastMessages = readToastMessages();
  const feedbackKinds: NeonFeedbackKind[] = [
    ...inlineMessages.map((message) => classifyNeonFeedbackMessage(message)),
    ...toastMessages.map((toast) => toast.kind),
  ];

  if (
    panel.querySelector(
      '[role="alert"], .text-destructive, [data-slot="form-message"]',
    ) &&
    feedbackKinds.length === 0
  ) {
    feedbackKinds.push("error");
  }

  if (
    [...panel.querySelectorAll("input, textarea")].some(
      (field) => field.getAttribute("aria-invalid") === "true",
    )
  ) {
    feedbackKinds.push("error");
  }

  return {
    sessionPending,
    neonMounted,
    formLoading,
    hasFocusedField,
    feedbackKind: mergeNeonFeedbackKinds(feedbackKinds),
  };
}
