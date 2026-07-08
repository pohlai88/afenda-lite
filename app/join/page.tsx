import { PortalInvitationJoinPage } from "@/components/portal-invitation-join-page";
import {
  clientInvitationJoinMetadata,
  runClientInvitationJoinPage,
} from "@/lib/client-invitation-entry";

export const metadata = clientInvitationJoinMetadata;
export const dynamic = "force-dynamic";

/** Dedicated client invitation entry — Neon Auth UI sign-up, then accept invitation. */
export default async function ClientInvitationJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  await runClientInvitationJoinPage({ searchParams });
  return <PortalInvitationJoinPage />;
}
