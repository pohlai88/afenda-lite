"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Empty,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import {
	type ChangeEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";

export type EntityRegisterCompany = Readonly<{
	legalCompanyId: string;
	companyCode: string;
	displayName: string;
	homeJurisdictionCountryCode: string;
	lifecycleStatus: string;
	completeness: "complete" | "incomplete" | "unavailable";
	registeredOffice: string | null | "unavailable";
}>;

export function EntityRegister({
	companies,
	nextCursor,
	path,
	showFirstPage,
}: Readonly<{
	companies: readonly EntityRegisterCompany[];
	nextCursor: string | null;
	path: string;
	showFirstPage: boolean;
}>) {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	const lifecycleStatuses = useMemo(
		() =>
			Array.from(
				new Set(companies.map((company) => company.lifecycleStatus)),
			).sort(),
		[companies],
	);
	const handleSearchChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
		[],
	);
	const handleStatusChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value),
		[],
	);
	const visibleCompanies = useMemo(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase();
		return companies.filter((company) => {
			const matchesStatus =
				status === "all" || company.lifecycleStatus === status;
			const matchesSearch =
				normalizedSearch.length === 0 ||
				[
					company.companyCode,
					company.displayName,
					company.homeJurisdictionCountryCode,
				]
					.join(" ")
					.toLocaleLowerCase()
					.includes(normalizedSearch);
			return matchesStatus && matchesSearch;
		});
	}, [companies, search, status]);
	const nextHref =
		nextCursor === null
			? null
			: `${path}?cursor=${encodeURIComponent(nextCursor)}`;
	let registerContent: ReactNode;
	if (companies.length === 0) {
		registerContent = (
			<Empty
				description="Register a legal-company draft once an active organization party is available."
				title="No legal companies in this organization"
			/>
		);
	} else if (visibleCompanies.length === 0) {
		registerContent = (
			<Empty
				description="Change the search or lifecycle filter to see records on this cursor page."
				title="No legal companies match the current filters"
			/>
		);
	} else {
		registerContent = (
			<div className="overflow-x-auto">
				<Table aria-label="Corporate Administration entity register">
					<TableHeader>
						<TableRow>
							<TableHead>Entity</TableHead>
							<TableHead>Lifecycle</TableHead>
							<TableHead>Completeness</TableHead>
							<TableHead>Registered office</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visibleCompanies.map((company) => (
							<TableRow key={company.legalCompanyId}>
								<TableCell>
									<div className="font-medium">{company.displayName}</div>
									<div className="text-foreground-tertiary text-sm">
										{company.companyCode} ·{" "}
										{company.homeJurisdictionCountryCode}
									</div>
								</TableCell>
								<TableCell>
									<StatusBadge
										label={displayCode(company.lifecycleStatus)}
										showIcon={false}
										status="pending"
									/>
								</TableCell>
								<TableCell>{completenessLabel(company.completeness)}</TableCell>
								<TableCell>
									{registeredOfficeLabel(company.registeredOffice)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	return (
		<section aria-labelledby="entity-register-heading" className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium text-lg" id="entity-register-heading">
						Entity register
					</h2>
					<p className="text-foreground-secondary text-sm">
						Tenant-scoped legal-company roots. Search and lifecycle filters
						apply to the current cursor page.
					</p>
				</div>
				<StatusBadge
					label={`${companies.length} loaded`}
					showIcon={false}
					status="pending"
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Legal companies</CardTitle>
					<CardDescription>
						Lifecycle, activation readiness, and registered-office evidence from
						the production Corporate Administration facade.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="entityRegisterSearch">Search current page</Label>
							<Input
								id="entityRegisterSearch"
								onChange={handleSearchChange}
								placeholder="Code, name, or jurisdiction"
								value={search}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="entityRegisterStatus">Lifecycle status</Label>
							<NativeSelect
								id="entityRegisterStatus"
								onChange={handleStatusChange}
								value={status}
							>
								<NativeSelectOption value="all">
									All statuses
								</NativeSelectOption>
								{lifecycleStatuses.map((lifecycleStatus) => (
									<NativeSelectOption
										key={lifecycleStatus}
										value={lifecycleStatus}
									>
										{displayCode(lifecycleStatus)}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
					</div>

					{registerContent}

					{showFirstPage || nextHref !== null ? (
						<Pagination>
							<PaginationContent>
								{showFirstPage ? (
									<PaginationItem>
										<PaginationLink href={path} size="default">
											First page
										</PaginationLink>
									</PaginationItem>
								) : null}
								{nextHref === null ? null : (
									<PaginationItem>
										<PaginationNext href={nextHref} />
									</PaginationItem>
								)}
							</PaginationContent>
						</Pagination>
					) : null}
				</CardContent>
			</Card>
		</section>
	);
}

function displayCode(value: string): string {
	return value.replaceAll("_", " ");
}

function completenessLabel(
	value: EntityRegisterCompany["completeness"],
): string {
	switch (value) {
		case "complete":
			return "Activation ready";
		case "incomplete":
			return "Activation incomplete";
		case "unavailable":
			return "Unavailable";
		default: {
			const exhaustive: never = value;
			return exhaustive;
		}
	}
}

function registeredOfficeLabel(
	value: EntityRegisterCompany["registeredOffice"],
): string {
	if (value === "unavailable") {
		return "Unavailable";
	}
	return value ?? "Not recorded";
}
