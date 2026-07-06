import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfirmationReceipt({
  code,
  title,
  description,
  variant = "card",
}: {
  code: string;
  title: string;
  description: string;
  variant?: "card" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div className="portal-info-block px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="font-mono text-lg font-semibold tracking-wide tabular-nums" translate="no">
          {code}
        </p>
      </div>
    );
  }

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="portal-prose mx-auto">
          <p>{description}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-lg font-semibold tracking-wide tabular-nums" translate="no">
          {code}
        </p>
      </CardContent>
    </Card>
  );
}
