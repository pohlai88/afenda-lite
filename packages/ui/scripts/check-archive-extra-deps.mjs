import fs from "node:fs";

const pkg = JSON.parse(
	fs.readFileSync(
		"C:/JackProject/afenda-bolt/afenda-lite/_reference/archive/shadcn-pro-dashboard/package.json",
		"utf8",
	),
);
const need = [
	"react-payment-inputs",
	"@stepperize/react",
	"react-aria-components",
	"@dnd-kit/modifiers",
	"react-19-credit-card",
	"zod",
];
for (const k of need) {
	console.log(
		k,
		pkg.dependencies?.[k] || pkg.devDependencies?.[k] || "(missing)",
	);
}
console.log("zod in ui", JSON.parse(fs.readFileSync("C:/JackProject/afenda-bolt/afenda-lite/packages/ui/package.json","utf8")).dependencies?.zod);
