import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function DeclarationSettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FieldSet
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10",
        className,
      )}
    >
      <div className="md:sticky md:top-6 md:self-start">
        <FieldLegend className="mb-1.5 font-semibold">{title}</FieldLegend>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </FieldSet>
  );
}

export function DeclarationSettingsDivider() {
  return <Separator className="my-8 md:my-10" />;
}
