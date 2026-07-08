import type { ReactNode } from "react";
import { StudioFormLayout02Section } from "@/components/shadcn-studio/blocks/form-layout-02/form-layout-section";
import { Separator } from "@/components/ui/separator";

/** form-layout-02 — portal adapter for declaration workspace settings sections. */
export function DeclarationSettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <StudioFormLayout02Section
      title={title}
      description={description}
      className={className}
    >
      {children}
    </StudioFormLayout02Section>
  );
}

export function DeclarationSettingsDivider() {
  return <Separator className="my-10" />;
}
