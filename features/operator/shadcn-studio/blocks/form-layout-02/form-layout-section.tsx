import type { ReactNode } from "react";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components-V2/platform-components/ui/field";
import { cn } from "@/lib/utils";

/** form-layout-02 — titled section shell from Shadcn Studio multi-section form block. */
export type StudioFormLayout02SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function StudioFormLayout02Section({
  title,
  description,
  children,
  className,
}: StudioFormLayout02SectionProps) {
  return (
    <FieldSet
      className={cn("grid grid-cols-1 gap-10 md:grid-cols-3", className)}
    >
      <div>
        <FieldLegend className="mb-1.5 font-semibold">{title}</FieldLegend>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </FieldSet>
  );
}

export default StudioFormLayout02Section;
