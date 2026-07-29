import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const salesOrderActions = [
	{
		path: "app/actions/list-sales-orders.ts",
		importName: "listSalesOrders",
		permission: "sales.order.list",
		mutates: false,
	},
	{
		path: "app/actions/get-sales-order.ts",
		importName: "getSalesOrderById",
		permission: "sales.order.read",
		mutates: false,
	},
	{
		path: "app/actions/create-sales-order.ts",
		importName: "createDraftSalesOrder",
		permission: "sales.order.create",
		mutates: true,
	},
	{
		path: "app/actions/add-sales-order-line.ts",
		importName: "addSalesOrderLine",
		permission: "sales.order.update",
		mutates: true,
	},
	{
		path: "app/actions/post-sales-order.ts",
		importName: "postSalesOrder",
		permission: "sales.order.post",
		mutates: true,
	},
	{
		path: "app/actions/cancel-sales-order.ts",
		importName: "cancelSalesOrder",
		permission: "sales.order.cancel",
		mutates: true,
	},
] as const;

const salesForms = [
	{
		path: "features/sales/create-sales-order-form.tsx",
		action: "createSalesOrderAction",
		capabilityProp: "canCreate",
	},
	{
		path: "features/sales/add-sales-order-line-form.tsx",
		action: "addSalesOrderLineAction",
		capabilityProp: "canUpdate",
	},
	{
		path: "features/sales/post-sales-order-form.tsx",
		action: "postSalesOrderAction",
		capabilityProp: "canPost",
	},
	{
		path: "features/sales/cancel-sales-order-form.tsx",
		action: "cancelSalesOrderAction",
		capabilityProp: "canCancel",
	},
] as const;

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

function collectSourceFiles(dir: string): string[] {
	const stats = statSync(dir, { throwIfNoEntry: false });
	if (!stats?.isDirectory()) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const entryStats = statSync(fullPath);
		if (entryStats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
			continue;
		}
		if (/\.(ts|tsx)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

describe("@afenda/web Sales scaffold contract", () => {
	it("keeps Sales route pages thin and route-grouped", () => {
		const routePages = [
			{
				path: "app/(operator)/admin/sales/page.tsx",
				surface: 'surface="admin"',
			},
			{
				path: "app/(client)/client/(workspace)/sales/page.tsx",
				surface: 'surface="client"',
			},
		] as const;

		for (const route of routePages) {
			const pageSource = source(route.path);
			expect(pageSource).toContain(
				'import { SalesShell } from "@/features/sales/sales-shell"',
			);
			expect(pageSource).toContain(route.surface);
			expect(pageSource).not.toContain("@afenda/db");
			expect(pageSource).not.toContain("fetch(");
			expect(pageSource).not.toContain("route.ts");
		}
	});

	it("keeps Sales order Actions thin over @afenda/sales", () => {
		for (const action of salesOrderActions) {
			const actionSource = source(action.path);
			expect(actionSource).toContain('"use server"');
			expect(actionSource).toContain(action.importName);
			expect(actionSource).toContain('from "@afenda/sales"');
			expect(actionSource).toContain("runOperatorPermissionAction");
			expect(actionSource).toContain(action.permission);
			expect(actionSource).toContain("createSalesCommandOptions()");
			expect(actionSource).toContain("mapPackageResult");
			expect(actionSource).toContain("session.orgId");
			expect(actionSource).toContain("session.userId");
			expect(actionSource).toContain("correlationId");
			expect(actionSource).not.toContain("@afenda/db");
			expect(actionSource).not.toContain("NextResponse");

			if (action.mutates) {
				expect(actionSource).toContain('revalidatePath("/admin/sales")');
				expect(actionSource).toContain('revalidatePath("/client/sales")');
			}
		}
	});

	it("keeps SalesShell as RSC package composition, not HTTP detour", () => {
		const shellSource = source("features/sales/sales-shell.tsx");
		expect(shellSource).toContain('from "@afenda/sales"');
		expect(shellSource).toContain("listSalesOrders(");
		expect(shellSource).toContain('from "@afenda/master-data"');
		expect(shellSource).toContain("listParties(");
		expect(shellSource).toContain("listItems(");
		expect(shellSource).toContain("listPaymentTerms(");
		expect(shellSource).toContain('from "@afenda/ui-system"');
		expect(shellSource).toContain(
			'requirePermission(session, "sales.order.read")',
		);
		expect(shellSource).toContain("sessionHasPermission");
		expect(shellSource).toContain("createSalesCommandOptions()");
		expect(shellSource).not.toContain('"use client"');
		expect(shellSource).not.toContain("fetch(");
		expect(shellSource).not.toContain("@afenda/db");
	});

	it("keeps Sales forms client-side adapters over Server Actions and ui-system", () => {
		for (const form of salesForms) {
			const formSource = source(form.path);
			expect(formSource).toContain('"use client"');
			expect(formSource).toContain('from "@afenda/ui-system"');
			expect(formSource).toContain("useActionState");
			expect(formSource).toContain(form.action);
			expect(formSource).toContain(form.capabilityProp);
			expect(formSource).toContain("actionFieldMessage");
			expect(formSource).not.toContain("@afenda/db");
			expect(formSource).not.toContain('from "@afenda/sales"');
			expect(formSource).not.toContain("fetch(");
		}
	});

	it("does not add Sales HTTP route handlers for web UI reads or mutations", () => {
		const apiFiles = collectSourceFiles(path.join(webRoot, "app", "api"));
		const salesApiFiles = apiFiles
			.map((file) => path.relative(webRoot, file).replaceAll("\\", "/"))
			.filter((file) => /sales|sales-order/.test(file));
		expect(salesApiFiles).toEqual([]);
	});
});
