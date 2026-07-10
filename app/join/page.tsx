import { StudioInvitationJoinPage } from "@/features/auth";
import {
  clientInvitationJoinMetadata,
  runClientInvitationJoinPage,
} from "@/lib/entry/client-invitation-entry";

export const metadata = clientInvitationJoinMetadata;
export const dynamic = "force-dynamic";

/** Canonical client invitation entry — Studio shell + Neon Auth UI. */
export default async function ClientInvitationJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  const { invitationId } = await runClientInvitationJoinPage({ searchParams });
  return <StudioInvitationJoinPage invitationId={invitationId} />;
}
