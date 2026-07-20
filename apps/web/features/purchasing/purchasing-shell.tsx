import { getSession, requireRole } from "@afenda/auth";
import {
	listItems,
	listParties,
	listPaymentTerms,
	listWarehouses,
} from "@afenda/master-data";
import { listPurchaseOrders } from "@afenda/purchasing";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import { AddPurchaseOrderLineForm } from "@/features/purchasing/add-purchase-order-line-form";
import { CancelPurchaseOrderForm } from "@/features/purchasing/cancel-purchase-order-form";
import { ClosePurchaseOrderForm } from "@/features/purchasing/close-purchase-order-form";
import { CreatePurchaseOrderForm } from "@/features/purchasing/create-purchase-order-form";
import { PostPurchaseOrderForm } from "@/features/purchasing/post-purchase-order-form";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type PurchasingShellProps = {
	surface: "admin" | "client";
};

/**
 * Purchasing console — RSC list via `@afenda/purchasing`; mutations via Actions.
 */
export async function PurchasingShell({ surface }: PurchasingShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();

	await requirePermission(session, "purchasing.order.read");
	const [canCreate, canUpdate, canPost, canCancel, canClose] =
		await Promise.all([
			sessionHasPermission(session, "purchasing.order.create"),
			sessionHasPermission(session, "purchasing.order.update"),
			sessionHasPermission(session, "purchasing.order.post"),
			sessionHasPermission(session, "purchasing.order.cancel"),
			sessionHasPermission(session, "purchasing.order.close"),
		]);

	const masterOptions = { authorization: createMasterDataAuthorizationPort() };

	const [
		ordersResult,
		partiesResult,
		itemsResult,
		termsResult,
		warehousesResult,
	] = await Promise.all([
		listPurchaseOrders(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId: `purchasing-shell:${session.orgId}:${session.userId}`,
				pageSize: 50,
			},
			createPurchasingCommandOptions(),
		),
		listParties(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			masterOptions,
		),
		listItems(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			masterOptions,
		),
		listPaymentTerms(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			masterOptions,
		),
		listWarehouses(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			masterOptions,
		),
	]);

	const orders = ordersResult.ok ? ordersResult.data : [];
	const parties = partiesResult.ok ? partiesResult.data : [];
	const items = itemsResult.ok ? itemsResult.data : [];
	const terms = termsResult.ok ? termsResult.data : [];
	const warehouses = warehousesResult.ok ? warehousesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Purchasing
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Purchase orders
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Orders reference <Code>md_party</Code> / <Code>md_item</Code> (and
					optional <Code>md_payment_term</Code> / <Code>md_warehouse</Code>)
					with commercial pricing at create/line and totals frozen on post.
					Lifecycle: draft → posted → closed (↘ cancelled from draft only).
				</p>
			</div>

			{!ordersResult.ok ? (
				<Alert>
					<AlertTitle>Could not load orders</AlertTitle>
					<AlertDescription>{ordersResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Orders</CardTitle>
					<CardDescription>
						{orders.length} order(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{orders.length === 0 ? (
						<p className="text-muted-foreground">No purchase orders yet.</p>
					) : (
						<ul className="space-y-2">
							{orders.map((order) => (
								<li key={order.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{order.code} · {order.status} · {order.currencyCode} · v
										{order.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{order.id}</Code> · party {order.partyCode} (
										{order.partyName}) · {order.lines.length} line(s)
										{order.documentTotal
											? ` · total ${order.documentTotal}`
											: ""}
										{order.paymentTermCode
											? ` · ${order.paymentTermCode} / net ${order.netDays}`
											: ""}
										{order.warehouseCode
											? ` · wh ${order.warehouseCode} (${order.warehouseName})`
											: ""}
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Master pickers (read)</CardTitle>
					<CardDescription>
						Resolve ids from Authority B — paste into forms below.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
					<div>
						<p className="mb-2 font-medium">Parties</p>
						<ul className="space-y-1 text-muted-foreground">
							{parties.slice(0, 12).map((party) => (
								<li key={party.id}>
									{party.code} · {party.status}
									<br />
									<Code>{party.id}</Code>
								</li>
							))}
						</ul>
					</div>
					<div>
						<p className="mb-2 font-medium">Items</p>
						<ul className="space-y-1 text-muted-foreground">
							{items.slice(0, 12).map((item) => (
								<li key={item.id}>
									{item.code} · {item.status}
									<br />
									<Code>{item.id}</Code>
								</li>
							))}
						</ul>
					</div>
					<div>
						<p className="mb-2 font-medium">Payment terms</p>
						<ul className="space-y-1 text-muted-foreground">
							{terms.slice(0, 12).map((term) => (
								<li key={term.id}>
									{term.code} · net {term.netDays} · {term.status}
									<br />
									<Code>{term.id}</Code>
								</li>
							))}
						</ul>
					</div>
					<div>
						<p className="mb-2 font-medium">Warehouses</p>
						<ul className="space-y-1 text-muted-foreground">
							{warehouses.slice(0, 12).map((warehouse) => (
								<li key={warehouse.id}>
									{warehouse.code} · {warehouse.status}
									<br />
									<Code>{warehouse.id}</Code>
								</li>
							))}
						</ul>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Create draft</CardTitle>
				</CardHeader>
				<CardContent>
					<CreatePurchaseOrderForm canCreate={canCreate} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Add line</CardTitle>
				</CardHeader>
				<CardContent>
					<AddPurchaseOrderLineForm canUpdate={canUpdate} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Post order</CardTitle>
					<CardDescription>
						Requires active party and line items; freezes commercial totals and
						snapshots.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PostPurchaseOrderForm canPost={canPost} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Cancel draft</CardTitle>
					<CardDescription>
						Draft only — posted orders use close instead.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CancelPurchaseOrderForm canCancel={canCancel} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Close posted</CardTitle>
					<CardDescription>
						Terminates remaining commitment; partial fulfilment is allowed.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ClosePurchaseOrderForm canClose={canClose} />
				</CardContent>
			</Card>
		</section>
	);
}
