#!/usr/bin/env node
/*
  Startup script for Coolify/Nixpacks:
  - Optionally runs `prisma generate`
  - Waits for DATABASE_URL to be reachable by retrying `prisma migrate deploy`
  - Starts Next.js server
*/

import { spawn } from "node:child_process";

function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve(0);
      const error = new Error(
        `${command} ${args.join(" ")} exited with code ${code}`
      );
      error.code = code;
      reject(error);
    });
  });
}

async function safeRun(command, args = []) {
  try {
    await run(command, args);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const port = process.env.PORT || "3000";
  const databaseUrl = process.env.DATABASE_URL;

  console.log(`[startup] Using Node ${process.version}`);

  // Ensure Prisma client is generated (idempotent and fast if already generated)
  console.log("[startup] Running prisma generate...");
  await safeRun("prisma", ["generate"]);

  if (!databaseUrl) {
    console.warn(
      "[startup] DATABASE_URL not set. Skipping migrations and starting server."
    );
    await run("next", ["start", "-p", port]);
    return;
  }

  const maxAttempts = Number(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS || 30);
  const backoffMs = Number(process.env.PRISMA_MIGRATE_BACKOFF_MS || 2000);

  console.log(
    `[startup] Running prisma migrate deploy with up to ${maxAttempts} attempts...`
  );
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptLabel = `[startup] prisma migrate deploy attempt ${attempt}/${maxAttempts}`;
    try {
      console.log(`${attemptLabel}...`);
      await run("prisma", ["migrate", "deploy"]);
      console.log("[startup] Prisma migrations applied successfully.");
      break;
    } catch (error) {
      if (attempt >= maxAttempts) {
        console.error(
          "[startup] Failed to apply Prisma migrations after maximum attempts. Exiting."
        );
        process.exit(typeof error.code === "number" ? error.code : 1);
      }
      console.warn(`${attemptLabel} failed. Retrying in ${backoffMs}ms...`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  console.log(`[startup] Starting Next.js on port ${port}...`);
  await run("next", ["start", "-p", port]);
}

main().catch((error) => {
  console.error("[startup] Unhandled error during startup:", error);
  process.exit(1);
});
