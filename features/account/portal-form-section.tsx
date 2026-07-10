import type { ReactNode } from "react";
import { StudioFormLayoutSection } from "@/features/account/studio/form-layout-section";

/** form-layout-01 — portal adapter for Studio form section shell. */
export function PortalFormSection({
  title,
  description,
  children,
  className,
  id,
  headingLevel = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  headingLevel?: 1 | 2;
}) {
  return (
    <StudioFormLayoutSection
      title={title}
      description={description}
      className={className}
      id={id}
      headingLevel={headingLevel}
    >
      {children}
    </StudioFormLayoutSection>
  );
}
