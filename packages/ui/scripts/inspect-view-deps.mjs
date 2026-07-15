import fs from "node:fs";

const file =
	"C:/JackProject/afenda-bolt/afenda-lite/packages/ui/src/views/pages/user-settings/index.tsx";
const text = fs.readFileSync(file, "utf8");
const lines = text.split(/\r?\n/);
for (let i = 0; i < Math.min(80, lines.length); i++) {
	if (
		lines[i].includes("import") ||
		lines[i].includes("server") ||
		lines[i].includes("actions")
	) {
		console.log(`${i + 1}: ${lines[i]}`);
	}
}

const pkg = JSON.parse(
	fs.readFileSync(
		"C:/JackProject/afenda-bolt/afenda-lite/_reference/archive/shadcn-pro-dashboard/package.json",
		"utf8",
	),
);
const ui = JSON.parse(
	fs.readFileSync(
		"C:/JackProject/afenda-bolt/afenda-lite/packages/ui/package.json",
		"utf8",
	),
);
const want = [
	"papaparse",
	"xlsx",
	"nuqs",
	"react-hook-form",
	"@hookform/resolvers",
	"@tanstack/react-table",
	"zod",
];
console.log("\narchive deps:");
for (const k of want) {
	console.log(
		k,
		pkg.dependencies?.[k] || pkg.devDependencies?.[k] || "(missing in archive)",
	);
}
console.log("\nui deps:");
for (const k of want) {
	console.log(
		k,
		ui.dependencies?.[k] || ui.devDependencies?.[k] || "(missing in ui)",
	);
}
