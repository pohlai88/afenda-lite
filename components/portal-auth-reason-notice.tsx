import { Alert, AlertDescription } from "@/components/ui/alert";

export function PortalAuthReasonNotice({ message }: { message: string }) {
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
