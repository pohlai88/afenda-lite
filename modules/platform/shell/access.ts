/** SaaS product modules on the shared AdminCN platform (not separate apps). */
export type ShellModuleId = "declarations" | "fft";

export type ShellNavKind = "module" | "admin";

export type ShellAccess = {
  /** Modules the session may see in the sidebar and enter. */
  modules: ShellModuleId[];
  /** Organization admin — admin-route nav/pages only, not Declarations. */
  isOrgAdmin: boolean;
};
