import { notFound, redirect } from "next/navigation";
import { ClientDeclarationForm } from "@/components/client-declaration-form";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { auth } from "@/lib/auth/server";
import { isAdminSession } from "@/lib/admin";
import {
  getClientAssignmentForUser,
  getClientProfile,
} from "@/lib/clients";
import { ensureDefaultQuestions } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientDeclarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: session } = await auth.getSession();

  if (!session?.user?.email) {
    redirect("/client/login");
  }

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  const profile = session.user.id
    ? await getClientProfile(session.user.id)
    : null;

  if (!profile?.onboardingComplete) {
    redirect("/client/onboarding");
  }

  const assignment = await getClientAssignmentForUser(id, session.user.email);

  if (!assignment || !assignment.surveySlug) {
    notFound();
  }

  const questions = await ensureDefaultQuestions(
    assignment.surveyId,
    assignment.surveyQuestion ?? "",
  );

  if (assignment.status === "submitted") {
    return (
      <PortalCustomerShell
        eyebrow={portalCopy.clientDashboard.eyebrow}
        title={assignment.surveyTitle ?? portalCopy.declarationForm.thankYouTitle}
        description={portalCopy.clientDashboard.receiptDescription}
      >
        <div className="portal-info-block px-4 py-6 text-center">
          <p className="font-mono text-lg font-semibold">
            {assignment.confirmationCode}
          </p>
        </div>
      </PortalCustomerShell>
    );
  }

  return (
    <PortalCustomerShell
      eyebrow={portalCopy.product.declarationEyebrow}
      title={assignment.surveyTitle ?? portalCopy.product.declarationEyebrow}
      description={portalCopy.declarationPage.secureFormNote}
    >
      <ClientDeclarationForm
        assignmentId={assignment.id}
        surveyId={assignment.surveyId}
        slug={assignment.surveySlug}
        title={assignment.surveyTitle ?? portalCopy.product.declarationEyebrow}
        description={assignment.surveyQuestion ?? undefined}
        questions={questions}
      />
    </PortalCustomerShell>
  );
}
