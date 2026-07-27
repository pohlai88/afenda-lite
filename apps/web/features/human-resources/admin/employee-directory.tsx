import { requireRole } from "@afenda/auth";
import { listEmployees } from "@afenda/human-resources";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Empty,
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
} from "@afenda/ui-system";
import Link from "next/link";

import { requirePermission } from "@/features/auth/require-permission";
import type { parseAdminEmployeeDirectoryParams } from "@/features/human-resources/admin/directory-params";
import type { HrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { formatHrInstant } from "@/features/human-resources/display-preferences";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

const PAGE_SIZE = 20;

type DirectoryParams = ReturnType<typeof parseAdminEmployeeDirectoryParams>;

function pageHref(input: {
	page: number;
	params: DirectoryParams;
	preferences: HrDisplayPreferences;
}): string {
	const search = new URLSearchParams({
		page: String(input.page),
		field: input.params.field,
		locale: input.preferences.locale,
		timeZone: input.preferences.timeZone,
	});
	if (input.params.query.length > 0) search.set("query", input.params.query);
	return `/admin/human-resources?${search.toString()}`;
}

export async function EmployeeDirectoryWorkspace({
	params,
	preferences,
}: {
	params: DirectoryParams;
	preferences: HrDisplayPreferences;
}) {
	const session = await requireRole("operator");
	await requirePermission(session, "human-resources.employee.read");
	const employees = await listEmployees(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			page: params.page,
			pageSize: PAGE_SIZE,
			...(params.query.length === 0
				? {}
				: params.field === "name"
					? { legalNamePrefix: params.query }
					: { employeeNumberPrefix: params.query }),
		},
		createHumanResourcesCommandOptions(),
	);
	const totalPages = employees.ok
		? Math.max(
				1,
				Math.ceil(employees.data.totalCount / employees.data.pageSize),
			)
		: 1;

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
			<header className="space-y-2">
				<p className="text-sm text-muted-foreground">
					Operator · Human resources
				</p>
				<h1 className="text-2xl font-semibold">Employee administration</h1>
				<p className="max-w-3xl text-sm text-muted-foreground">
					Find employee records and continue employment, assignment, lifecycle,
					and compliance work from the employee context.
				</p>
			</header>

			<nav
				aria-label="Human resources administration"
				className="flex flex-wrap gap-2"
			>
				<Button asChild variant="outline" size="sm">
					<Link href="/admin/human-resources/candidates">Candidates</Link>
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href="/admin/human-resources/operations">Operations</Link>
				</Button>
			</nav>

			<search>
				<form
					action="/admin/human-resources"
					method="get"
					className="grid gap-3 border-y py-4 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-end"
				>
					<input type="hidden" name="locale" value={preferences.locale} />
					<input type="hidden" name="timeZone" value={preferences.timeZone} />
					<div className="space-y-2">
						<Label htmlFor="employee-search-field">Search by</Label>
						<NativeSelect
							id="employee-search-field"
							name="field"
							defaultValue={params.field}
						>
							<NativeSelectOption value="name">Legal name</NativeSelectOption>
							<NativeSelectOption value="employeeNumber">
								Employee number
							</NativeSelectOption>
						</NativeSelect>
					</div>
					<div className="space-y-2">
						<Label htmlFor="employee-search">Employee search</Label>
						<Input
							id="employee-search"
							name="query"
							type="search"
							defaultValue={params.query}
							maxLength={200}
							placeholder={
								params.field === "name"
									? "Start of legal name"
									: "Start of employee number"
							}
						/>
					</div>
					<Button type="submit">Search</Button>
				</form>
			</search>

			{!employees.ok ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Employee directory unavailable</AlertTitle>
					<AlertDescription>
						The directory could not be loaded. Retry or contact HR support.
					</AlertDescription>
				</Alert>
			) : employees.data.employees.length === 0 ? (
				<Empty
					title="No employees found"
					description="Change the search prefix or clear the search to view the directory."
					action={
						<Button asChild variant="outline">
							<Link href="/admin/human-resources">Clear search</Link>
						</Button>
					}
				/>
			) : (
				<section
					aria-labelledby="employee-directory-heading"
					className="space-y-4"
				>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2
								id="employee-directory-heading"
								className="text-lg font-medium"
							>
								Employee directory
							</h2>
							<p className="text-sm text-muted-foreground">
								{employees.data.totalCount} records · page {employees.data.page}{" "}
								of {totalPages}
							</p>
						</div>
					</div>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee number</TableHead>
									<TableHead>Legal name</TableHead>
									<TableHead>Record version</TableHead>
									<TableHead>Updated</TableHead>
									<TableHead className="text-right">Record</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employees.data.employees.map((employee) => (
									<TableRow key={employee.id}>
										<TableCell className="font-medium">
											{employee.employeeNumber}
										</TableCell>
										<TableCell>{employee.legalName}</TableCell>
										<TableCell>{employee.version}</TableCell>
										<TableCell>
											{formatHrInstant(employee.updatedAt, preferences)}
										</TableCell>
										<TableCell className="text-right">
											<Button asChild variant="ghost" size="sm">
												<Link
													href={`/admin/human-resources/employees/${employee.id}`}
												>
													Open
												</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					<nav
						aria-label="Employee directory pages"
						className="flex items-center justify-between"
					>
						<Button
							asChild
							variant="outline"
							size="sm"
							disabled={params.page <= 1}
						>
							<Link
								href={pageHref({
									page: Math.max(1, params.page - 1),
									params,
									preferences,
								})}
								aria-disabled={params.page <= 1}
								tabIndex={params.page <= 1 ? -1 : undefined}
							>
								Previous
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="sm"
							disabled={params.page >= totalPages}
						>
							<Link
								href={pageHref({ page: params.page + 1, params, preferences })}
								aria-disabled={params.page >= totalPages}
								tabIndex={params.page >= totalPages ? -1 : undefined}
							>
								Next
							</Link>
						</Button>
					</nav>
				</section>
			)}
		</main>
	);
}
