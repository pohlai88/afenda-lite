#!/usr/bin/env node
import { spawn } from "node:child_process";

process.env.API_KEY ??= process.env.SHADCN_STUDIO_LICENSE_KEY ?? "";
process.env.EMAIL ??= process.env.SHADCN_STUDIO_ACCOUNT_EMAIL ?? "";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["-y", "shadcn-studio-mcp@latest"], {
  env: process.env,
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start shadcn-studio-mcp:", error.message);
  process.exit(1);
});
