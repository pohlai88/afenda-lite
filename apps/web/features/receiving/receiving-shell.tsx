import { getSession, requireRole } from "@afenda/auth";
import { listItems, listWarehouses } from "@afenda/master-data";
import {
	listGoodsReceipts,
	listReceivingInventoryExceptions,
} from "@afenda/receiving";
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
import { AddGoodsReceiptLineForm } from "@/features/receiving/add-goods-receipt-line-form";
import { CancelGoodsReceiptForm } from "@/features/receiving/cancel-goods-receipt-form";
import { CreateGoodsReceiptForm } from "@/features/receiving/create-goods-receipt-form";
import { PostGoodsReceiptForm } from "@/features/receiving/post-goods-receipt-form";
import { RecordReceivingDiscrepancyForm } from "@/features/receiving/record-receiving-discrepancy-form";
import { ResolveReceivingDiscrepancyForm } from "@/features/receiving/resolve-receiving-discrepancy-form";
import { ReverseGoodsReceiptForm } from "@/features/receiving/reverse-goods-receipt-form";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type ReceivingShellProps = { surface: "admin" | "client" };

/** Receiving console — RSC reads via `@afenda/receiving`; mutations via Actions. */
export async function ReceivingShell({ surface }: ReceivingShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "receiving.receipt.read");
	const [
		canCreate,
		canUpdate,
		canPost,
		canCancel,
		canReverse,
		canRecordDiscrepancy,
		canResolveDiscrepancy,
	] = await Promise.all([
		sessionHasPermission(session, "receiving.receipt.create"),
		sessionHasPermission(session, "receiving.receipt.update"),
		sessionHasPermission(session, "receiving.receipt.post"),
		sessionHasPermission(session, "receiving.receipt.cancel"),
		sessionHasPermission(session, "receiving.receipt.reverse"),
		sessionHasPermission(session, "receiving.discrepancy.record"),
		sessionHasPermission(session, "receiving.discrepancy.resolve"),
	]);
	const masterOptions = { authorization: createMasterDataAuthorizationPort() };
	const receivingOptions = createReceivingCommandOptions();

	const [receiptsResult, exceptionsResult, itemsResult, warehousesResult] =
		await Promise.all([
			listGoodsReceipts(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				receivingOptions,
			),
			listReceivingInventoryExceptions(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				receivingOptions,
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
	const receipts = receiptsResult.ok ? receiptsResult.data : [];
	const exceptions = exceptionsResult.ok ? exceptionsResult.data : [];
	const items = itemsResult.ok ? itemsResult.data : [];
	const warehouses = warehousesResult.ok ? warehousesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Receiving
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Goods receipts
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Record inbound goods against purchase orders, post accepted quantity
					to inventory, reverse posted receipts, and manage discrepancies.
				</p>
			</div>

			{!receiptsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load receipts</AlertTitle>
					<AlertDescription>{receiptsResult.message}</AlertDescription>
				</Alert>
			) : null}

			{exceptions.length > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Inventory application exceptions</CardTitle>
						<CardDescription>
							{exceptions.length} posted receipt(s) pending or failed inventory
							application
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<ul className="space-y-2">
							{exceptions.map((receipt) => (
								<li key={receipt.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{receipt.code} · {receipt.inventoryApplicationStatus}
									</div>
									<div className="text-muted-foreground">
										id <Code>{receipt.id}</Code>
										{receipt.inventoryApplicationError
											? ` · ${receipt.inventoryApplicationError}`
											: null}
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Receipts</CardTitle>
					<CardDescription>
						{receipts.length} receipt(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{receipts.length === 0 ? (
						<p className="text-muted-foreground">No goods receipts yet.</p>
					) : (
						<ul className="space-y-2">
							{receipts.map((receipt) => (
								<li key={receipt.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{receipt.code} · {receipt.status} · v{receipt.version}
										{receipt.reversesReceiptId ? " · reverse" : null}
										{receipt.reversedByReceiptId ? " · reversed" : null}
									</div>
									<div className="text-muted-foreground">
										id <Code>{receipt.id}</Code> · {receipt.sourceType}
										{receipt.sourceId ? (
											<>
												{" "}
												· source <Code>{receipt.sourceId}</Code>
											</>
										) : null}{" "}
										· wh {receipt.warehouseCode} ({receipt.warehouseName}) ·{" "}
										{receipt.lines.length} line(s) ·{" "}
										{receipt.discrepancies.length} discrepancy record(s) · inv{" "}
										{receipt.inventoryApplicationStatus}
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
					<CreateGoodsReceiptForm canManage={canCreate} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Add line</CardTitle>
				</CardHeader>
				<CardContent>
					<AddGoodsReceiptLineForm canManage={canUpdate} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Post receipt</CardTitle>
					<CardDescription>
						Posts accepted quantity to inventory. Requires lines and active
						warehouse/items.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PostGoodsReceiptForm canManage={canPost} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Record discrepancy</CardTitle>
				</CardHeader>
				<CardContent>
					<RecordReceivingDiscrepancyForm canManage={canRecordDiscrepancy} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Resolve discrepancy</CardTitle>
				</CardHeader>
				<CardContent>
					<ResolveReceivingDiscrepancyForm canResolve={canResolveDiscrepancy} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Cancel draft receipt</CardTitle>
					<CardDescription>
						Draft only. Posted receipts must be reversed.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CancelGoodsReceiptForm canManage={canCancel} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Reverse posted receipt</CardTitle>
					<CardDescription>
						Creates a linked compensating receipt and inventory reversal.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ReverseGoodsReceiptForm canReverse={canReverse} />
				</CardContent>
			</Card>
		</section>
	);
}
