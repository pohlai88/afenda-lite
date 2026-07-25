"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Textarea,
} from "@afenda/ui-system";
import { useActionState, useId } from "react";

import {
	createBeneficialOwnerDisclosureAction,
	createShareClassAction,
	createShareTransactionAction,
	type ShareCapitalMutationActionState,
} from "@/app/actions/corporate-administration-share-capital";

export type ShareCapitalSnapshot = {
	classes: Array<{
		id: string;
		label: string;
		summary: string;
		status: string;
		version: number;
	}>;
	transactions: Array<{
		id: string;
		label: string;
		summary: string;
		status: string;
	}>;
	holdings: Array<{
		holderPartyId: string;
		holderLabel: string;
		quantity: string;
		shareClassId: string;
	}>;
	certificates: Array<{
		id: string;
		label: string;
		summary: string;
		status: string;
		version: number;
	}>;
	beneficialOwners: Array<{
		id: string;
		label: string;
		summary: string;
		status: string;
		version: number;
	}>;
};

function CommandResult({ state }: { state: ShareCapitalMutationActionState }) {
	if (!state) return null;
	return (
		<Alert variant={state.ok ? "default" : "destructive"} aria-live="polite">
			<AlertTitle>
				{state.ok ? "Share capital record saved" : "Could not save"}
			</AlertTitle>
			<AlertDescription>
				{state.ok
					? `Record ${state.data.entity.id}${state.data.entity.version ? ` is now at version ${state.data.entity.version}` : ""}.`
					: state.message}
			</AlertDescription>
		</Alert>
	);
}

function ShareClassCreateForm({
	legalCompanyId,
}: {
	legalCompanyId: string;
}) {
	const requestId = useId();
	const [state, action, pending] = useActionState<
		ShareCapitalMutationActionState,
		FormData
	>(createShareClassAction, null);

	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="requestId" value={requestId} />
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-code`}>Class code</Label>
					<Input id={`${requestId}-code`} name="code" required />
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-classType`}>Class type</Label>
					<NativeSelect id={`${requestId}-classType`} name="classType" required>
						<NativeSelectOption value="ordinary">Ordinary</NativeSelectOption>
						<NativeSelectOption value="preference">Preference</NativeSelectOption>
						<NativeSelectOption value="other">Other</NativeSelectOption>
					</NativeSelect>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-currencyCode`}>Currency</Label>
					<Input id={`${requestId}-currencyCode`} name="currencyCode" defaultValue="MYR" required />
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-parValue`}>Par value</Label>
					<Input id={`${requestId}-parValue`} name="parValue" defaultValue="1.00" required />
				</div>
				<div className="grid gap-2 md:col-span-2">
					<Label htmlFor={`${requestId}-authorizedQuantity`}>Authorized quantity</Label>
					<Input id={`${requestId}-authorizedQuantity`} name="authorizedQuantity" defaultValue="1000000" required />
				</div>
			</div>
			<CommandResult state={state} />
			<Button type="submit" disabled={pending}>
				Create share class
			</Button>
		</form>
	);
}

function IssuanceForm({
	legalCompanyId,
	shareClassId,
	defaultPartyId,
}: {
	legalCompanyId: string;
	shareClassId: string;
	defaultPartyId?: string;
}) {
	const requestId = useId();
	const [state, action, pending] = useActionState<
		ShareCapitalMutationActionState,
		FormData
	>(createShareTransactionAction, null);
	const legsJson = JSON.stringify([
		{ holderPartyId: defaultPartyId ?? "", quantityDelta: "1000" },
	]);

	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="requestId" value={requestId} />
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<input type="hidden" name="shareClassId" value={shareClassId} />
			<input type="hidden" name="transactionType" value="issuance" />
			<input type="hidden" name="legs" value={legsJson} />
			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-reference`}>Reference</Label>
					<Input id={`${requestId}-reference`} name="transactionReference" required />
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-date`}>Transaction date</Label>
					<Input id={`${requestId}-date`} name="transactionDate" type="date" required />
				</div>
			</div>
			<CommandResult state={state} />
			<Button type="submit" disabled={pending || !defaultPartyId}>
				Post issuance
			</Button>
		</form>
	);
}

export function ShareCapitalPanel({
	legalCompanyId,
	snapshot,
	canManage,
	defaultPartyId,
}: {
	legalCompanyId: string;
	snapshot: ShareCapitalSnapshot;
	canManage: boolean;
	defaultPartyId?: string;
}) {
	const firstClass = snapshot.classes[0];

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Share classes</CardTitle>
					<CardDescription>
						Authorized capital classes for this legal company.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Class</TableHead>
								<TableHead>Summary</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{snapshot.classes.map((row) => (
								<TableRow key={row.id}>
									<TableCell>{row.label}</TableCell>
									<TableCell>{row.summary}</TableCell>
									<TableCell>{row.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{canManage ? (
						<Accordion type="single" collapsible>
							<AccordionItem value="create-class">
								<AccordionTrigger>Create share class</AccordionTrigger>
								<AccordionContent>
									<ShareClassCreateForm legalCompanyId={legalCompanyId} />
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Holdings as of today</CardTitle>
					<CardDescription>
						Derived from posted, unreversed transaction legs.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Holder</TableHead>
								<TableHead>Quantity</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{snapshot.holdings.map((row) => (
								<TableRow key={`${row.shareClassId}-${row.holderPartyId}`}>
									<TableCell>{row.holderLabel}</TableCell>
									<TableCell>{row.quantity}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Transactions</CardTitle>
					<CardDescription>Posted share ledger entries.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reference</TableHead>
								<TableHead>Summary</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{snapshot.transactions.map((row) => (
								<TableRow key={row.id}>
									<TableCell>{row.label}</TableCell>
									<TableCell>{row.summary}</TableCell>
									<TableCell>{row.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{canManage && firstClass ? (
						<IssuanceForm
							legalCompanyId={legalCompanyId}
							shareClassId={firstClass.id}
							defaultPartyId={defaultPartyId}
						/>
					) : null}
				</CardContent>
			</Card>

			{canManage ? (
				<Accordion type="single" collapsible>
					<AccordionItem value="ubo">
						<AccordionTrigger>Declare beneficial owner</AccordionTrigger>
						<AccordionContent>
							<BeneficialOwnerForm
								legalCompanyId={legalCompanyId}
								defaultPartyId={defaultPartyId}
							/>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			) : null}
		</div>
	);
}

function BeneficialOwnerForm({
	legalCompanyId,
	defaultPartyId,
}: {
	legalCompanyId: string;
	defaultPartyId?: string;
}) {
	const requestId = useId();
	const [state, action, pending] = useActionState<
		ShareCapitalMutationActionState,
		FormData
	>(createBeneficialOwnerDisclosureAction, null);

	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="requestId" value={requestId} />
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<div className="grid gap-4">
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-party`}>Beneficial owner party ID</Label>
					<Input
						id={`${requestId}-party`}
						name="partyId"
						defaultValue={defaultPartyId}
						required
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-control`}>Nature of control codes</Label>
					<Textarea id={`${requestId}-control`} name="natureOfControlCodes" required />
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${requestId}-effectiveFrom`}>Effective from</Label>
					<Input id={`${requestId}-effectiveFrom`} name="effectiveFrom" type="date" required />
				</div>
			</div>
			<CommandResult state={state} />
			<Button type="submit" disabled={pending}>
				Declare beneficial owner
			</Button>
		</form>
	);
}
