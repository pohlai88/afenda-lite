import fs from "node:fs";

const text = fs.readFileSync(".env.local", "utf8");
const keys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

for (const key of keys) {
	const line = text.split(/\r?\n/).find((l) => {
		const t = l.trimStart();
		return t.startsWith(`${key}=`) || t.startsWith(`#${key}=`);
	});
	if (!line) {
		console.log(JSON.stringify({ key, status: "absent" }));
		continue;
	}
	const commented = line.trimStart().startsWith("#");
	const raw = line.replace(/^\s*#?/, "").slice(key.length + 1);
	const value = raw.trim().replace(/^["']|["']$/g, "");
	const row = {
		key,
		status: commented ? "commented" : value.length > 0 ? "present" : "empty",
		length: value.length,
	};
	if (key.includes("URL")) {
		row.looksLikeUrl = value.startsWith("https://");
		row.looksLikeUpstashHost = value.includes(".upstash.io");
	}
	console.log(JSON.stringify(row));
}

// Optional live ping (status only) when both present and uncommented
const urlLine = text.split(/\r?\n/).find((l) => l.trimStart().startsWith("UPSTASH_REDIS_REST_URL="));
const tokenLine = text
	.split(/\r?\n/)
	.find((l) => l.trimStart().startsWith("UPSTASH_REDIS_REST_TOKEN="));

if (urlLine && tokenLine) {
	const url = urlLine.slice("UPSTASH_REDIS_REST_URL=".length).trim();
	const token = tokenLine.slice("UPSTASH_REDIS_REST_TOKEN=".length).trim();
	if (url && token) {
		try {
			const res = await fetch(`${url.replace(/\/$/, "")}/ping`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			console.log(
				JSON.stringify({
					key: "UPSTASH_PING",
					status: "checked",
					httpStatus: res.status,
					ok: res.ok,
				}),
			);
		} catch (err) {
			console.log(
				JSON.stringify({
					key: "UPSTASH_PING",
					status: "network_error",
					name: err instanceof Error ? err.name : "Error",
				}),
			);
		}
	}
}
