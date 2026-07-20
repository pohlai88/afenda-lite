import { getSession, requireRole } from "@afenda/auth";
import {
	getStockAvailability,
	getStockMovementById,
	listStockMovements,
	listStockReservations,
} from "@afenda/inventory";
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
import Link from "next/link";

import { requirePermission } from "@/features/auth/require-permission";
import { AddStockMovementLineForm } from "@/features/inventory/add-stock-movement-line-form";
import { CancelReservationForm } from "@/features/inventory/cancel-reservation-form";
import { CancelStockMovementForm } from "@/features/inventory/cancel-stock-movement-form";
import { CreateReversalMovementForm } from "@/features/inventory/create-reversal-movement-form";
import { CreateStockMovementForm } from "@/features/inventory/create-stock-movement-form";
import { ExpireReservationForm } from "@/features/inventory/expire-reservation-form";
import { PostStockMovementForm } from "@/features/inventory/post-stock-movement-form";
import { ReleaseReservationForm } from "@/features/inventory/release-reservation-form";
import { ReserveStockForm } from "@/features/inventory/reserve-stock-form";
import { StockAvailabilityTable } from "@/features/inventory/stock-availability-table";
import { StockMovementsTable } from "@/features/inventory/stock-movements-table";
import { StockReservationsTable } from "@/features/inventory/stock-reservations-table";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type InventoryShellProps = {
	surface: "admin" | "client";
	movementId?: string;
};

function warehouseLabel(movement: {
	warehouseCode: string | null;
	fromWarehouseCode: string | null;
	toWarehouseCode: string | null;
}): string {
	if (movement.fromWarehouseCode && movement.toWarehouseCode) {
		return `${movement.fromWarehouseCode} → ${movement.toWarehouseCode}`;
	}
	return movement.warehouseCode ?? "—";
}

/**
 * Inventory console — RSC list via `@afenda/inventory`; mutations via Actions (admin only).
 */
export async function InventoryShell({
	surface,
	movementId,
}: InventoryShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();

	await requirePermission(session, "inventory.movement.read");
	const mutationsEnabled = surface === "admin";

	const [
		canReadAvailability,
		canCreate,
		canPost,
		canCancel,
		canReserve,
		canRelease,
		canAdjust,
	] = await Promise.all([
		sessionHasPermission(session, "inventory.availability.read"),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.movement.create")
			: Promise.resolve(false),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.movement.post")
			: Promise.resolve(false),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.movement.cancel")
			: Promise.resolve(false),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.reservation.create")
			: Promise.resolve(false),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.reservation.release")
			: Promise.resolve(false),
		mutationsEnabled
			? sessionHasPermission(session, "inventory.adjustment.post")
			: Promise.resolve(false),
	]);

	const masterOptions = { authorization: createMasterDataAuthorizationPort() };
	const inventoryOptions = createInventoryCommandOptions();
	const detailHrefBase =
		surface === "admin" ? "/admin/inventory" : "/client/inventory";

	const [
		movementsResult,
		availabilityResult,
		reservationsResult,
		itemsResult,
		warehousesResult,
		detailResult,
	] = await Promise.all([
		listStockMovements(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			inventoryOptions,
		),
		canReadAvailability
			? getStockAvailability(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					inventoryOptions,
				)
			: Promise.resolve(null),
		listStockReservations(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			inventoryOptions,
		),
		mutationsEnabled
			? listItems(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						pageSize: 50,
					},
					masterOptions,
				)
			: Promise.resolve(null),
		mutationsEnabled
			? listWarehouses(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						pageSize: 50,
					},
					masterOptions,
				)
			: Promise.resolve(null),
		movementId
			? getStockMovementById(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						id: movementId,
					},
					inventoryOptions,
				)
			: Promise.resolve(null),
	]);

	const movements = movementsResult.ok ? movementsResult.data : [];
	const availability = availabilityResult?.ok ? availabilityResult.data : [];
	const reservations = reservationsResult.ok ? reservationsResult.data : [];
	const items = itemsResult?.ok ? itemsResult.data : [];
	const warehouses = warehousesResult?.ok ? warehousesResult.data : [];
	const detail = detailResult?.ok ? detailResult.data : null;
	const detailLoadFailed =
		movementId !== undefined &&
		detailResult !== null &&
		(!detailResult.ok || detailResult.data === null);

	const masterItemOptions = items.map((item) => ({
		id: item.id,
		code: item.code,
		status: item.status,
	}));
	const masterWarehouseOptions = warehouses.map((warehouse) => ({
		id: warehouse.id,
		code: warehouse.code,
		status: warehouse.status,
	}));

	const draftDefaults =
		detail !== null && detail.status === "draft"
			? { movementId: detail.id, version: detail.version }
			: undefined;
	const postedDefaults =
		detail !== null && detail.status === "posted"
			? { movementId: detail.id, version: detail.version }
			: undefined;

	const activeReservation = reservations.find(
		(reservation) =>
			reservation.status === "active" ||
			reservation.status === "partially_consumed",
	);
	const reservationDefaults =
		activeReservation !== undefined
			? {
					reservationId: activeReservation.id,
					version: activeReservation.version,
				}
			: undefined;

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Inventory
					{mutationsEnabled ? "" : " · read-only"}
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Stock movements
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					{mutationsEnabled ? (
						<>
							Sole mutator of <Code>on_hand</Code> / <Code>available</Code> /{" "}
							<Code>reserved</Code>, ledger, and movement tables. Masters via{" "}
							<Code>md_item</Code> / <Code>md_warehouse</Code>. UI create is
							opening-balance receipt, transfer, or adjustment only — peer
							receiving/fulfillment posts with source-event linkage.
						</>
					) : (
						<>
							Read-only stock movements, availability, and reservations for this
							organization. Mutations run on the operator inventory console.
						</>
					)}
				</p>
			</div>

			{!movementsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load movements</AlertTitle>
					<AlertDescription>{movementsResult.message}</AlertDescription>
				</Alert>
			) : null}

			{detailLoadFailed ? (
				<Alert>
					<AlertTitle>Movement not found</AlertTitle>
					<AlertDescription>
						No movement matches <Code>{movementId}</Code> in this organization.{" "}
						<Link
							href={detailHrefBase}
							className="underline underline-offset-4"
						>
							Clear selection
						</Link>
					</AlertDescription>
				</Alert>
			) : null}

			{detail !== null ? (
				<Card>
					<CardHeader>
						<CardTitle>
							{detail.code} · {detail.movementType} · {detail.status}
						</CardTitle>
						<CardDescription>
							v{detail.version} · {detail.source} · {detail.lines.length}{" "}
							line(s) · id <Code>{detail.id}</Code>
							{" · "}
							<Link
								href={detailHrefBase}
								className="underline underline-offset-4"
							>
								Clear selection
							</Link>
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<p className="text-muted-foreground">
							{warehouseLabel(detail)}
							{detail.adjustmentReasonCode
								? ` · reason ${detail.adjustmentReasonCode}`
								: ""}
						</p>
						{detail.lines.length === 0 ? (
							<p className="text-muted-foreground">No lines yet.</p>
						) : (
							<ul className="space-y-1">
								{detail.lines.map((line) => (
									<li key={line.id}>
										#{line.lineNo} · {line.itemCode} · qty {line.quantity}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Movements</CardTitle>
					<CardDescription>
						{movements.length} movement(s) · pageSize ≤ 50 · open a row for
						detail
					</CardDescription>
				</CardHeader>
				<CardContent>
					<StockMovementsTable
						detailHrefBase={detailHrefBase}
						rows={movements.map((movement) => ({
							id: movement.id,
							code: movement.code,
							movementType: movement.movementType,
							source: movement.source,
							status: movement.status,
							version: movement.version,
							lineCount: movement.lines.length,
							warehouseLabel: warehouseLabel(movement),
						}))}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Availability</CardTitle>
					<CardDescription>
						{canReadAvailability
							? `${availability.length} availability row(s) · org-scoped`
							: "Requires inventory.availability.read"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!canReadAvailability ? (
						<Alert role="status">
							<AlertTitle>Availability unavailable</AlertTitle>
							<AlertDescription>
								Grant <Code>inventory.availability.read</Code> to view on-hand,
								reserved, and available quantities.
							</AlertDescription>
						</Alert>
					) : availabilityResult !== null && !availabilityResult.ok ? (
						<p className="text-sm text-muted-foreground">
							{availabilityResult.message}
						</p>
					) : (
						<StockAvailabilityTable
							rows={availability.map((row) => ({
								id: `${row.warehouseId}:${row.itemId}`,
								warehouseCode: row.warehouseCode,
								itemCode: row.itemCode,
								onHandQuantity: row.onHandQuantity,
								reservedQuantity: row.reservedQuantity,
								availableQuantity: row.availableQuantity,
							}))}
						/>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Reservations</CardTitle>
					<CardDescription>
						{reservations.length} reservation(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!reservationsResult.ok ? (
						<p className="text-sm text-muted-foreground">
							{reservationsResult.message}
						</p>
					) : (
						<StockReservationsTable
							rows={reservations.map((reservation) => ({
								id: reservation.id,
								code: reservation.code,
								status: reservation.status,
								warehouseCode: reservation.warehouseCode,
								itemCode: reservation.itemCode,
								quantity: reservation.quantity,
								consumedQuantity: reservation.consumedQuantity,
								version: reservation.version,
							}))}
						/>
					)}
				</CardContent>
			</Card>

			{mutationsEnabled ? (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Create draft</CardTitle>
							<CardDescription>
								Opening-balance receipt, transfer, or adjustment (peer sources
								denied here).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CreateStockMovementForm
								canCreate={canCreate}
								canAdjust={canAdjust}
								warehouses={masterWarehouseOptions}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Add line</CardTitle>
						</CardHeader>
						<CardContent>
							<AddStockMovementLineForm
								canCreate={canCreate}
								items={masterItemOptions}
								defaultMovementId={draftDefaults?.movementId}
								defaultExpectedVersion={draftDefaults?.version}
							/>
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
							<PostStockMovementForm
								canPost={canPost}
								defaultMovementId={draftDefaults?.movementId}
								defaultExpectedVersion={draftDefaults?.version}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Cancel draft movement</CardTitle>
						</CardHeader>
						<CardContent>
							<CancelStockMovementForm
								canCancel={canCancel}
								defaultMovementId={draftDefaults?.movementId}
								defaultExpectedVersion={draftDefaults?.version}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Create reversal movement</CardTitle>
							<CardDescription>
								Posts a compensating movement for a posted stock movement.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CreateReversalMovementForm
								canPost={canPost}
								defaultMovementId={postedDefaults?.movementId}
								defaultExpectedVersion={postedDefaults?.version}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Reserve stock</CardTitle>
						</CardHeader>
						<CardContent>
							<ReserveStockForm
								canReserve={canReserve}
								warehouses={masterWarehouseOptions}
								items={masterItemOptions}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Release reservation</CardTitle>
						</CardHeader>
						<CardContent>
							<ReleaseReservationForm
								canRelease={canRelease}
								defaultReservationId={reservationDefaults?.reservationId}
								defaultExpectedVersion={reservationDefaults?.version}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Expire reservation</CardTitle>
							<CardDescription>
								Marks active reservation expired and frees reserved quantity.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ExpireReservationForm
								canRelease={canRelease}
								defaultReservationId={reservationDefaults?.reservationId}
								defaultExpectedVersion={reservationDefaults?.version}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Cancel reservation</CardTitle>
							<CardDescription>
								Cancels active reservation and frees reserved quantity.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CancelReservationForm
								canRelease={canRelease}
								defaultReservationId={reservationDefaults?.reservationId}
								defaultExpectedVersion={reservationDefaults?.version}
							/>
						</CardContent>
					</Card>
				</>
			) : null}
		</section>
	);
}
