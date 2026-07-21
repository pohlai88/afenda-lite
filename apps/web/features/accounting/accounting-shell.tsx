import { getTrialBalance, listJournals } from "@afenda/accounting";
import { getSession, requireRole } from "@afenda/auth";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import {
	AddJournalLineForm,
	CloseAccountingPeriodForm,
	CreateDraftJournalForm,
	OpenAccountingPeriodForm,
	PostJournalForm,
	ReopenAccountingPeriodForm,
	ReverseJournalForm,
	SoftCloseAccountingPeriodForm,
} from "@/features/accounting/accounting-forms";
import {
	JournalsTable,
	TrialBalanceTable,
} from "@/features/accounting/accounting-tables";
import { requirePermission } from "@/features/auth/require-permission";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type AccountingShellProps = { surface: "admin" | "client" };

const formSections = [
	["Open accounting period", OpenAccountingPeriodForm],
	["Soft-close accounting period", SoftCloseAccountingPeriodForm],
	["Close accounting period", CloseAccountingPeriodForm],
	["Reopen accounting period", ReopenAccountingPeriodForm],
	["Create draft journal", CreateDraftJournalForm],
	["Add journal line", AddJournalLineForm],
	["Post journal", PostJournalForm],
	["Reverse journal", ReverseJournalForm],
] as const;

/** Accounting console — RSC reads via `@afenda/accounting`; mutations via Actions. */
export async function AccountingShell({ surface }: AccountingShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "accounting.journal.read");
	const canManage = await sessionHasPermission(session, "accounting.journal.create");
	const options = createAccountingCommandOptions();
	const [journalsResult, trialBalanceResult] = await Promise.all([
		listJournals(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				page: 1,
				pageSize: 50,
			},
			options,
		),
		getTrialBalance(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
			},
			options,
		),
	]);
	const journals = journalsResult.ok ? journalsResult.data : [];
	const trialBalance = trialBalanceResult.ok ? trialBalanceResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Accounting
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Manage accounting periods and journals, post balanced entries, reverse
					posted journals, and review the organization trial balance.
				</p>
			</div>

			{!journalsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load journals</AlertTitle>
					<AlertDescription>{journalsResult.message}</AlertDescription>
				</Alert>
			) : null}
			{!trialBalanceResult.ok ? (
				<Alert>
					<AlertTitle>Could not load trial balance</AlertTitle>
					<AlertDescription>{trialBalanceResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Journal register</CardTitle>
					<CardDescription>
						{journals.length} journal(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent>
					<JournalsTable
						rows={journals.map((journal) => ({
							id: journal.id,
							code: journal.code,
							periodId: journal.periodId,
							status: journal.status,
							version: journal.version,
							currencyCode: journal.currencyCode,
							lineCount: journal.lines.length,
						}))}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Trial balance</CardTitle>
					<CardDescription>
						{trialBalance.length} account balance row(s) across posted journals
					</CardDescription>
				</CardHeader>
				<CardContent>
					<TrialBalanceTable rows={trialBalance} />
				</CardContent>
			</Card>

			{formSections.map(([title, Form]) => (
				<Card key={title}>
					<CardHeader>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent>
						<Form canManage={canManage} />
					</CardContent>
				</Card>
			))}
		</section>
	);
}
