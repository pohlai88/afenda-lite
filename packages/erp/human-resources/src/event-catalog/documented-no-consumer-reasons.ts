import type { HumanResourcesDomain } from "../emissions/types";

const DOCUMENTED_NO_CONSUMER_REASON_BY_DOMAIN: Record<
	HumanResourcesDomain,
	string
> = {
	leave:
		"No downstream event consumer registered; approved leave facts are available via the approved-leave query port.",
	time: "No downstream event consumer registered; time and attendance facts are emitted for future payroll handoff integration.",
	"workforce-foundation":
		"No downstream event consumer registered; person and worker foundation facts are audit-traceable via platform outbox.",
	core: "No downstream event consumer registered; core employment facts are audit-traceable via platform outbox.",
	organization:
		"No downstream event consumer registered; organization structure facts are audit-traceable via platform outbox.",
	recruitment:
		"No downstream event consumer registered; recruitment pipeline facts are audit-traceable via platform outbox.",
	lifecycle:
		"No downstream event consumer registered; lifecycle transition facts are audit-traceable via platform outbox.",
	"compensation-benefits":
		"No downstream event consumer registered; compensation and benefit facts are audit-traceable via platform outbox.",
	performance:
		"No downstream event consumer registered; performance management facts are audit-traceable via platform outbox.",
	learning:
		"No downstream event consumer registered; learning completion facts are audit-traceable via platform outbox.",
	privacy:
		"No downstream event consumer registered; privacy operations are audit-traceable via platform outbox.",
	talent:
		"No downstream event consumer registered; talent management facts are audit-traceable via platform outbox.",
	compliance:
		"No downstream event consumer registered; compliance document and eligibility facts are audit-traceable via platform outbox.",
	"employee-relations":
		"No downstream event consumer registered; employee relations case facts are audit-traceable via platform outbox.",
	"workforce-planning":
		"No downstream event consumer registered; headcount planning facts are audit-traceable via platform outbox.",
};

export function documentedNoConsumerReason(
	domain: HumanResourcesDomain,
): string {
	return DOCUMENTED_NO_CONSUMER_REASON_BY_DOMAIN[domain];
}
