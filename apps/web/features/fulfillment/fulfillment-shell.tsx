import { getSession, requireRole } from "@afenda/auth";
import { listDeliveries } from "@afenda/fulfillment";
import { listItems, listWarehouses } from "@afenda/master-data";
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
import {
	AddDeliveryLineForm,
	CancelDeliveryForm,
	ConfirmPackForm,
	ConfirmPickForm,
	CreateDraftDeliveryForm,
	PostDeliveryForm,
	RecordProofOfDeliveryForm,
	StartPickingForm,
} from "@/features/fulfillment/fulfillment-forms";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type FulfillmentShellProps = { surface: "admin" | "client" };

/** Fulfillment console — RSC reads via `@afenda/fulfillment`; mutations via Actions. */
export async function FulfillmentShell({ surface }: FulfillmentShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "fulfillment.read");
	const canManage = await sessionHasPermission(session, "fulfillment.manage");
	const masterOptions = { authorization: createMasterDataAuthorizationPort() };

	const [deliveriesResult, itemsResult, warehousesResult] = await Promise.all([
		listDeliveries(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			createFulfillmentCommandOptions(),
		),
		listItems(
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
	const deliveries = deliveriesResult.ok ? deliveriesResult.data : [];
	const items = itemsResult.ok ? itemsResult.data : [];
	const warehouses = warehousesResult.ok ? warehousesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Fulfillment
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">Deliveries</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Create outbound deliveries, add lines, pick, pack, post, record proof
					of delivery, and cancel eligible deliveries.
				</p>
			</div>

			{!deliveriesResult.ok ? (
				<Alert>
					<AlertTitle>Could not load deliveries</AlertTitle>
					<AlertDescription>{deliveriesResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Deliveries</CardTitle>
					<CardDescription>
						{deliveries.length} delivery record(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{deliveries.length === 0 ? (
						<p className="text-muted-foreground">No deliveries yet.</p>
					) : (
						<ul className="space-y-2">
							{deliveries.map((delivery) => (
								<li key={delivery.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{delivery.code} · {delivery.status} · v{delivery.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{delivery.id}</Code> · wh {delivery.warehouseCode}{" "}
										({delivery.warehouseName}) · {delivery.lines.length} line(s)
										· {delivery.picks.length} pick(s) · {delivery.packs.length}{" "}
										pack(s)
										{delivery.proofOfDelivery ? " · proof recorded" : ""}
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
						Resolve item and warehouse ids for the forms below.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 text-sm md:grid-cols-2">
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
					<CreateDraftDeliveryForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Add line</CardTitle>
				</CardHeader>
				<CardContent>
					<AddDeliveryLineForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Start picking</CardTitle>
				</CardHeader>
				<CardContent>
					<StartPickingForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Confirm pick</CardTitle>
				</CardHeader>
				<CardContent>
					<ConfirmPickForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Confirm pack</CardTitle>
				</CardHeader>
				<CardContent>
					<ConfirmPackForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Post delivery</CardTitle>
				</CardHeader>
				<CardContent>
					<PostDeliveryForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Record proof of delivery</CardTitle>
				</CardHeader>
				<CardContent>
					<RecordProofOfDeliveryForm canManage={canManage} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Cancel delivery</CardTitle>
				</CardHeader>
				<CardContent>
					<CancelDeliveryForm canManage={canManage} />
				</CardContent>
			</Card>
		</section>
	);
}
