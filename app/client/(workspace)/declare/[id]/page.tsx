import {
  clientDeclarePageMetadata,
  runClientDeclarePage,
} from "@/lib/pages/client-declare-page";

export const metadata = clientDeclarePageMetadata;
export const dynamic = "force-dynamic";

/** Client declare — product UI tombstoned; stable unavailable page (no redirect loop). */
export default async function ClientDeclarePage() {
  return runClientDeclarePage();
}
