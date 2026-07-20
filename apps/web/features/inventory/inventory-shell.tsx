import { getSession, requireRole } from "@afenda/auth";
import { getStockAvailability, listStockMovements } from "@afenda/inventory";
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
import { AddStockMovementLineForm } from "@/features/inventory/add-stock-movement-line-form";
import { CreateStockMovementForm } from "@/features/inventory/create-stock-movement-form";
import { PostStockMovementForm } from "@/features/inventory/post-stock-movement-form";
import { ReleaseReservationForm } from "@/features/inventory/release-reservation-form";
import { ReserveStockForm } from "@/features/inventory/reserve-stock-form";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type InventoryShellProps = {
	surface: "admin" | "client";
};

/**
 * Inventory console — RSC list via `@afenda/inventory`; mutations via Actions.
 */
export async function InventoryShell({ surface }: InventoryShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();

	await requirePermission(session, "inventory.read");
	const canManage = await sessionHasPermission(session, "inventory.manage");

	const masterOptions = { authorization: createMasterDataAuthorizationPort() };
	const inventoryOptions = createInventoryCommandOptions();

	const [movementsResult, availabilityResult, itemsResult, warehousesResult] =
		await Promise.all([
			listStockMovements(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				inventoryOptions,
			),
			getStockAvailability(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
				},
				inventoryOptions,
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

	const movements = movementsResult.ok ? movementsResult.data : [];
	const balances = availabilityResult.ok ? availabilityResult.data : [];
	const items = itemsResult.ok ? itemsResult.data : [];
	const warehouses = warehousesResult.ok ? warehousesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Inventory
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Stock movements
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Sole mutator of <Code>on_hand</Code> / <Code>available</Code> /{" "}
					<Code>reserved</Code>, ledger, and movement tables. Masters via{" "}
					<Code>md_item</Code> / <Code>md_warehouse</Code>.
				</p>
			</div>

			{!movementsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load movements</AlertTitle>
					<AlertDescription>{movementsResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Movements</CardTitle>
					<CardDescription>
						{movements.length} movement(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{movements.length === 0 ? (
						<p className="text-muted-foreground">No stock movements yet.</p>
					) : (
						<ul className="space-y-2">
							{movements.map((movement) => (
								<li key={movement.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{movement.code} · {movement.movementType} ·{" "}
										{movement.status} · v{movement.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{movement.id}</Code> · {movement.lines.length}{" "}
										line(s)
										{movement.warehouseCode
											? ` · wh ${movement.warehouseCode}`
											: ""}
										{movement.fromWarehouseCode
											? ` · from ${movement.fromWarehouseCode}`
											: ""}
										{movement.toWarehouseCode
											? ` · to ${movement.toWarehouseCode}`
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
					<CardTitle>Availability</CardTitle>
					<CardDescription>
						{balances.length} balance row(s) · org-scoped
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					{!availabilityResult.ok ? (
						<p className="text-muted-foreground">
							{availabilityResult.message}
						</p>
					) : balances.length === 0 ? (
						<p className="text-muted-foreground">No stock balances yet.</p>
					) : (
						<ul className="space-y-2">
							{balances.slice(0, 20).map((balance) => (
								<li key={balance.id} className="rounded-md border px-3 py-2">
									{balance.warehouseCode} · {balance.itemCode} · on_hand{" "}
									{balance.onHand} · reserved {balance.reserved} · available{" "}
									{balance.available}
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
					<CreateStockMovementForm canManage={canManage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Add line</CardTitle>
				</CardHeader>
				<CardContent>
					<AddStockMovementLineForm canManage={canManage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Post movement</CardTitle>
					<CardDescription>
						Applies ledger and balance effects; optimistic version required.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PostStockMovementForm canManage={canManage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Reserve stock</CardTitle>
				</CardHeader>
				<CardContent>
					<ReserveStockForm canManage={canManage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Release reservation</CardTitle>
				</CardHeader>
				<CardContent>
					<ReleaseReservationForm canManage={canManage} />
				</CardContent>
			</Card>
		</section>
	);
}
