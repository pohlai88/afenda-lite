import { getSession, requireRole } from "@afenda/auth";
import { listItems, listParties, listPaymentTerms } from "@afenda/master-data";
import { listSalesOrders } from "@afenda/sales";
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
import { AddSalesOrderLineForm } from "@/features/sales/add-sales-order-line-form";
import { CancelSalesOrderForm } from "@/features/sales/cancel-sales-order-form";
import { CreateSalesOrderForm } from "@/features/sales/create-sales-order-form";
import { PostSalesOrderForm } from "@/features/sales/post-sales-order-form";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type SalesShellProps = {
	surface: "admin" | "client";
};

/**
 * Sales console — RSC list via `@afenda/sales`; mutations via Actions.
 */
export async function SalesShell({ surface }: SalesShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();

	await requirePermission(session, "sales.order.read");
	const [canCreate, canUpdate, canPost, canCancel] = await Promise.all([
		sessionHasPermission(session, "sales.order.create"),
		sessionHasPermission(session, "sales.order.update"),
		sessionHasPermission(session, "sales.order.post"),
		sessionHasPermission(session, "sales.order.cancel"),
	]);

	const [ordersResult, partiesResult, itemsResult, termsResult] =
		await Promise.all([
			listSalesOrders(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId: `sales-shell:${session.orgId}:${session.userId}`,
					pageSize: 50,
				},
				createSalesCommandOptions(),
			),
			listParties(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			),
			listItems(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			),
			listPaymentTerms(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			),
		]);

	const orders = ordersResult.ok ? ordersResult.data : [];
	const parties = partiesResult.ok ? partiesResult.data : [];
	const items = itemsResult.ok ? itemsResult.data : [];
	const terms = termsResult.ok ? termsResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Sales
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">Sales orders</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Orders reference <Code>md_party</Code> / <Code>md_item</Code> (and
					optional <Code>md_payment_term</Code>) with snapshots at create and
					post.
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
						<p className="text-muted-foreground">No sales orders yet.</p>
					) : (
						<ul className="space-y-2">
							{orders.map((order) => (
								<li key={order.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{order.code} · {order.status} · v{order.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{order.id}</Code> · party {order.partyCode} (
										{order.partyName}) · {order.currencyCode}
										{order.documentTotal
											? ` ${order.documentTotal}`
											: ""}{" "}
										· {order.lines.length} line(s)
										{order.paymentTermCode
											? ` · ${order.paymentTermCode} / net ${order.netDays}`
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
				<CardContent className="grid gap-4 text-sm md:grid-cols-3">
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Create draft</CardTitle>
				</CardHeader>
				<CardContent>
					<CreateSalesOrderForm canCreate={canCreate} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Add line</CardTitle>
				</CardHeader>
				<CardContent>
					<AddSalesOrderLineForm canUpdate={canUpdate} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Post order</CardTitle>
					<CardDescription>
						Requires active party and line items; re-stamps then freezes
						snapshots.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PostSalesOrderForm canPost={canPost} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Cancel order</CardTitle>
					<CardDescription>
						Cancels draft or posted orders; posted cancel is an explicit
						reversal path.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CancelSalesOrderForm canCancel={canCancel} />
				</CardContent>
			</Card>
		</section>
	);
}
