import { Card, CardContent } from "@/components/ui/card";

export function PortalEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
