/** Row models for `/dashboard/clients` datatables (lib-owned; consumed by components). */

export type OrgClientInvitationRow = {
  id: string;
  token: string;
  fullName: string;
  email: string;
  status: "pending" | "accepted" | "expired";
};

export type OrgClientAssignmentRow = {
  id: string;
  surveyId: string;
  surveyTitle: string;
  clientEmail: string;
  status: "pending" | "submitted";
  dueDate: string | null;
};
