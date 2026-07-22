from pathlib import Path

base = Path(__file__).parent
main = (base / "employee-relations.ts").read_text(encoding="utf-8")
methods1 = (base / "_employee-relations-methods.ts").read_text(encoding="utf-8")
part2 = (base / "_employee-relations-part2.ts").read_text(encoding="utf-8")

idx = main.index("/*__ER_METHODS__*/")
helpers = main[:idx].rstrip() + "\n\n"

promote = (
	"function promoteToInvestigatingIfOpen(status: EmployeeCaseStatus): EmployeeCaseStatus {\n"
	'\treturn status === "open" ? "investigating" : status;\n'
	"}\n\n"
)

start = methods1.index("{") + 1
methods1_body = methods1[start:].replace("/*__ER_METHODS_PART2__*/", "").strip()

part2_lines = [ln for ln in part2.splitlines() if not ln.startswith("//")]
part2_body = "\n".join(part2_lines).strip()

header_methods = (
	"const drizzleEmployeeRelationsMethods: DrizzleEmployeeRelationsMethods &\n"
	"\tThisType<EmployeeRelationsHost & DrizzleEmployeeRelationsMethods> = {\n"
)

footer = (
	"\n};\n\n"
	"export function attachDrizzleEmployeeRelations(target: EmployeeRelationsHost): void {\n"
	"\tObject.assign(target, drizzleEmployeeRelationsMethods);\n"
	"}\n"
)

out = helpers + promote + header_methods + methods1_body + "\n\n" + part2_body + footer
(base / "employee-relations.ts").write_text(out, encoding="utf-8")
print("lines", out.count("\n") + 1)
