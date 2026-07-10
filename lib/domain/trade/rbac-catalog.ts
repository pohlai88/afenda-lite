/**
 * Hot Sales RBAC permission catalog + default role templates (data only).
 * Authorization must use permission codes — never role display names / template_key in business ifs.
 */

export const HOT_SALES_SCOPE_TYPES = [
  "own",
  "team",
  "event",
  "bu",
  "company",
  "platform",
] as const;

export type HotSalesScopeType = (typeof HOT_SALES_SCOPE_TYPES)[number];

export type HotSalesPermissionDef = {
  code: string;
  description: string;
  /** Sensitive grants require explicit attach + rbac audit. */
  sensitive: boolean;
};

/** Fixed product-owned permission catalog (ADR-001). */
export const HOT_SALES_PERMISSION_CATALOG: readonly HotSalesPermissionDef[] = [
  { code: "event.view", description: "View Hot Sales events", sensitive: false },
  { code: "event.create", description: "Create Hot Sales events", sensitive: false },
  { code: "event.edit", description: "Edit event setup", sensitive: false },
  { code: "event.open_close", description: "Open or close event window", sensitive: false },
  { code: "product.manage", description: "Manage products", sensitive: false },
  { code: "supply.manage", description: "Manage supply quantities", sensitive: false },
  { code: "priority.manage", description: "Manage customer priority", sensitive: false },
  { code: "custom_field.manage", description: "Manage custom field defs", sensitive: false },
  { code: "order.create", description: "Submit orders", sensitive: false },
  { code: "order.view_own", description: "View own orders", sensitive: false },
  { code: "order.view_team", description: "View team orders", sensitive: false },
  { code: "order.view_all", description: "View all orders", sensitive: false },
  { code: "allocation.preview", description: "Preview allocation", sensitive: false },
  { code: "allocation.run", description: "Run allocation", sensitive: false },
  {
    code: "allocation.override",
    description: "Manually override allocation",
    sensitive: true,
  },
  { code: "transfer.request", description: "Request order transfer", sensitive: false },
  { code: "transfer.approve", description: "Approve order transfer", sensitive: false },
  { code: "deposit.view", description: "View deposit status", sensitive: false },
  {
    code: "deposit.manage",
    description: "Manage deposit records",
    sensitive: true,
  },
  { code: "pickup.view", description: "View pickup queue", sensitive: false },
  { code: "pickup.manage", description: "Manage pickup fulfillment", sensitive: false },
  { code: "export.orders", description: "Export orders / event summary", sensitive: false },
  { code: "export.finance", description: "Export finance reports", sensitive: false },
  { code: "sync.retry", description: "Retry ERP sync jobs", sensitive: true },
  { code: "audit.view", description: "View audit logs", sensitive: false },
  {
    code: "role.manage",
    description: "Manage roles and assignments",
    sensitive: true,
  },
] as const;

export type HotSalesPermissionCode =
  (typeof HOT_SALES_PERMISSION_CATALOG)[number]["code"];

export const SENSITIVE_PERMISSION_CODES: ReadonlySet<string> = new Set(
  HOT_SALES_PERMISSION_CATALOG.filter((p) => p.sensitive).map((p) => p.code),
);

export function isSensitivePermission(code: string): boolean {
  return SENSITIVE_PERMISSION_CODES.has(code);
}

export type HotSalesRoleTemplateDef = {
  /** Stable seed key — not for authorization ifs. */
  templateKey: string;
  name: string;
  description: string;
  permissionCodes: readonly string[];
};

const ALL_CODES = HOT_SALES_PERMISSION_CATALOG.map((p) => p.code);

const SALES_EXEC_CODES = [
  "event.view",
  "order.create",
  "order.view_own",
  "transfer.request",
  "deposit.view",
] as const;

const SALES_SUPERVISOR_CODES = [
  ...SALES_EXEC_CODES,
  "order.view_team",
] as const;

const SALES_MANAGER_CODES = [
  ...SALES_SUPERVISOR_CODES,
  "order.view_all",
  "allocation.preview",
  "export.orders",
] as const;

const VIEWER_CODES = [
  "event.view",
  "order.view_all",
  "deposit.view",
  "pickup.view",
  "audit.view",
  "export.orders",
] as const;

/** Job titles as seed templates only — clients may rename/disable. */
export const HOT_SALES_ROLE_TEMPLATES: readonly HotSalesRoleTemplateDef[] = [
  {
    templateKey: "super_admin",
    name: "Super Admin",
    description: "Platform / full Hot Sales control",
    permissionCodes: ALL_CODES,
  },
  {
    templateKey: "client_admin",
    name: "Client Admin",
    description: "Client org admin including role.manage",
    permissionCodes: ALL_CODES,
  },
  {
    templateKey: "business_unit_manager",
    name: "Business Unit Manager",
    description: "BU-scoped management",
    permissionCodes: [
      "event.view",
      "event.edit",
      "event.open_close",
      "product.manage",
      "supply.manage",
      "priority.manage",
      "order.view_all",
      "allocation.preview",
      "allocation.run",
      "transfer.approve",
      "deposit.view",
      "pickup.view",
      "export.orders",
      "audit.view",
    ],
  },
  {
    templateKey: "sales_executive",
    name: "Sales Executive",
    description: "Create orders; view own",
    permissionCodes: SALES_EXEC_CODES,
  },
  {
    templateKey: "sales_supervisor",
    name: "Sales Supervisor",
    description: "Team-scoped order view",
    permissionCodes: SALES_SUPERVISOR_CODES,
  },
  {
    templateKey: "sales_manager",
    name: "Sales Manager",
    description: "Broader sales scope",
    permissionCodes: SALES_MANAGER_CODES,
  },
  {
    templateKey: "sales_operations",
    name: "Sales Operations",
    description: "Ops-adjacent sales support",
    permissionCodes: [
      "event.view",
      "order.view_all",
      "allocation.preview",
      "priority.manage",
      "export.orders",
      "pickup.view",
    ],
  },
  {
    templateKey: "account_finance",
    name: "Account/Finance",
    description: "Deposit view/manage (2B-ready)",
    permissionCodes: [
      "event.view",
      "order.view_all",
      "deposit.view",
      "deposit.manage",
      "export.orders",
      "export.finance",
      "sync.retry",
      "audit.view",
    ],
  },
  {
    templateKey: "viewer",
    name: "Viewer",
    description: "Read-only",
    permissionCodes: VIEWER_CODES,
  },
  {
    templateKey: "commercial_ops_governance",
    name: "Commercial Operation & Governance",
    description: "Governance / commercial oversight",
    permissionCodes: [
      "event.view",
      "order.view_all",
      "allocation.preview",
      "audit.view",
      "export.orders",
      "deposit.view",
    ],
  },
  {
    templateKey: "general_manager",
    name: "General Manager",
    description: "Broad read + selected manage",
    permissionCodes: [
      "event.view",
      "event.edit",
      "event.open_close",
      "order.view_all",
      "allocation.preview",
      "allocation.run",
      "transfer.approve",
      "deposit.view",
      "pickup.view",
      "export.orders",
      "export.finance",
      "audit.view",
    ],
  },
] as const;
