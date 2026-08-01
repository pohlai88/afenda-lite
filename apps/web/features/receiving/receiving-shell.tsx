import { authServer } from "@afenda/auth";
import { listItems, listWarehouses } from "@afenda/master-data";
import {
	listGoodsReceipts,
	listReceivingInventoryExceptions,
} from "@afenda/receiving";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	WorkspacePage,
	WorkspacePageContent,
	WorkspacePageHeader,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import { AddGoodsReceiptLineForm } from "@/features/receiving/add-goods-receipt-line-form";
import { CancelGoodsReceiptForm } from "@/features/receiving/cancel-goods-receipt-form";
import { CreateGoodsReceiptForm } from "@/features/receiving/create-goods-receipt-form";
import { PostGoodsReceiptForm } from "@/features/receiving/post-goods-receipt-form";
import {
	GoodsReceiptsTable,
	ReceivingExceptionsTable,
} from "@/features/receiving/receiving-tables";
import { RecordReceivingDiscrepancyForm } from "@/features/receiving/record-receiving-discrepancy-form";
import { ResolveReceivingDiscrepancyForm } from "@/features/receiving/resolve-receiving-discrepancy-form";
import { ReverseGoodsReceiptForm } from "@/features/receiving/reverse-goods-receipt-form";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

interface ReceivingShellProps {
	surface: "admin" | "client";
}

function describeReceiptRelation(
	reversesReceiptId: string | null | undefined,
	reversedByReceiptId: string | null | undefined,
): string {
	if (reversesReceiptId) {
		return `Reverses ${reversesReceiptId}`;
	}
	if (reversedByReceiptId) {
		return `Reversed by ${reversedByReceiptId}`;
	}
	return "—";
}

/** Receiving console — RSC reads via `@afenda/receiving`; mutations via Actions. */
export async function ReceivingShell({ surface }: ReceivingShellProps) {
	const session =
		surface === "admin"
			? await authServer.session.requireRole("operator")
			: await authServer.session.get();
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
	const receiptRows = receipts.map((receipt) => ({
		id: receipt.id,
		code: receipt.code,
		status: receipt.status,
		version: receipt.version,
		source: receipt.sourceId
			? `${receipt.sourceType} · ${receipt.sourceId}`
			: receipt.sourceType,
		warehouse: `${receipt.warehouseCode} · ${receipt.warehouseName}`,
		lineCount: receipt.lines.length,
		discrepancyCount: receipt.discrepancies.length,
		inventoryStatus: receipt.inventoryApplicationStatus,
		relation: describeReceiptRelation(
			receipt.reversesReceiptId,
			receipt.reversedByReceiptId,
		),
	}));
	const exceptionRows = exceptions.map((receipt) => ({
		id: receipt.id,
		code: receipt.code,
		inventoryStatus: receipt.inventoryApplicationStatus,
		errorMessage: receipt.inventoryApplicationError ?? "Review required",
	}));
	const items = itemsResult.ok ? itemsResult.data : [];
	const warehouses = warehousesResult.ok ? warehousesResult.data : [];

	return (
		<WorkspacePage>
			<WorkspacePageHeader
				description="Record inbound goods against purchase orders, post accepted quantity to inventory, reverse posted receipts, and manage discrepancies."
				scope={`${surface === "admin" ? "Operator" : "Client"} · Receiving`}
				title="Goods receipts"
			/>
			<WorkspacePageContent>
				{exceptions.length > 0 || !exceptionsResult.ok ? (
					<Card>
						<CardHeader>
							<CardTitle>Inventory application exceptions</CardTitle>
							<CardDescription>
								{exceptions.length} posted receipt(s) pending or failed
								inventory application
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ReceivingExceptionsTable
								error={
									exceptionsResult.ok ? undefined : exceptionsResult.message
								}
								rows={exceptionRows}
							/>
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
					<CardContent>
						<GoodsReceiptsTable
							error={receiptsResult.ok ? undefined : receiptsResult.message}
							rows={receiptRows}
						/>
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
						<ResolveReceivingDiscrepancyForm
							canResolve={canResolveDiscrepancy}
						/>
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
			</WorkspacePageContent>
		</WorkspacePage>
	);
}
