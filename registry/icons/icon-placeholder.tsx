import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import * as Lucide from "lucide-react";
import { HelpCircle } from "lucide-react";

type IconPlaceholderProps = LucideProps & {
  lucide?: string;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
};

/**
 * Shadcn Studio blocks ship with IconPlaceholder (multi-icon-pack).
 * Portal uses lucide-react only — resolve the `lucide` prop name at runtime.
 */
export function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: IconPlaceholderProps) {
  const icons = Lucide as unknown as Record<string, ComponentType<LucideProps>>;
  const Icon =
    (lucide && icons[lucide]) ||
    (lucide && icons[lucide.replace(/Icon$/, "")]) ||
    HelpCircle;

  return <Icon {...props} />;
}
