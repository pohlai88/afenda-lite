/** Row models for `/dashboard` declaration datatable (lib-owned; consumed by components). */

export type OrgDeclarationRow = {
  id: string;
  title: string;
  description: string;
  caseNumber: string | null;
  responseCount: number;
};
