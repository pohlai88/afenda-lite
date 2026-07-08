import {
  clientLoginPageMetadata,
  runClientSignInEntryPage,
} from "@/lib/client-sign-in-entry";
import { redirectInvitationIdToJoin } from "@/lib/client-invitation-entry";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/** Session router — same client sign-in dispatch as `/client/login`. */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; invitationId?: string }>;
}) {
  await redirectInvitationIdToJoin({ searchParams });
  return runClientSignInEntryPage({ searchParams });
}
