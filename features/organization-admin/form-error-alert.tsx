import { Alert, AlertDescription } from "@/components-V2/platform-components/ui/alert";

export function FormErrorAlert({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <Alert variant="destructive" role="alert" aria-live="polite">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
