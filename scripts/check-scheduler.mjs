#!/usr/bin/env node

// Script to check cron/scheduler status (tasks are run via Coolify scheduled tasks)
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const url = `${baseUrl}/api/dev/scheduler-status`;

console.log("[Scheduler Check] Checking scheduler / cron status...\n");

try {
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.log("[Scheduler Check] Error:", data.error);
    if (data.details) {
      console.log("Details:", data.details);
    }
    process.exit(1);
  }

  const result = data.result ?? data;
  const scheduler = result.scheduler ?? {};
  const environment = result.environment ?? {};

  console.log("[Scheduler Check] Scheduler status:");
  console.log("===================");
  console.log(
    `Scheduled externally: ${scheduler.scheduledExternally ? "[Scheduler Check] YES" : "[Scheduler Check] NO"}`,
  );
  if (scheduler.message) {
    console.log(`Message: ${scheduler.message}`);
  }
  console.log(
    `In-process running: ${scheduler.isRunning ? "[Scheduler Check] YES" : "[Scheduler Check] NO"}`,
  );

  console.log("\n[Scheduler Check] Environment:");
  console.log("===============");
  console.log(`Node env: ${environment.nodeEnv ?? "—"}`);
  console.log(
    `Cron secret configured: ${environment.cronSecretConfigured ? "[Scheduler Check] YES" : "[Scheduler Check] NO"}`,
  );
  console.log(`Campaign IDs: ${environment.campaignIds ?? "—"}`);

  console.log("\n[Scheduler Check] Tips:");
  console.log("========");
  if (scheduler.scheduledExternally) {
    console.log(
      "- Cron jobs are run by Coolify scheduled tasks (e.g. curl to /api/cron/*)",
    );
    console.log(
      '- Trigger lead polling manually: POST /api/dev/scheduler-status with { "action": "poll" }',
    );
    console.log("- Or use admin UI to trigger polling");
  } else {
    console.log("- Check CRON_SECRET is set if calling cron endpoints");
  }

  console.log("\n🧪 Manual trigger:");
  console.log("==================");
  console.log(
    '- POST to /api/dev/scheduler-status with body: { "action": "poll" }',
  );
  console.log(
    "- Or call cron endpoints with x-cron-secret header (e.g. from Coolify)",
  );
} catch (error) {
  console.error("❌ Network error:", error.message);
  console.log(
    "\n[Scheduler Check] Make sure the app is running (e.g. yarn dev)",
  );
  process.exit(1);
}
