#!/usr/bin/env node

// Script to check cron/scheduler status (tasks are run via Coolify scheduled tasks)
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const url = `${baseUrl}/api/dev/scheduler-status`;

console.log("🔍 Checking scheduler / cron status...\n");

try {
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.log("❌ Error:", data.error);
    if (data.details) {
      console.log("Details:", data.details);
    }
    process.exit(1);
  }

  const result = data.result ?? data;
  const scheduler = result.scheduler ?? {};
  const environment = result.environment ?? {};

  console.log("📊 Scheduler status:");
  console.log("===================");
  console.log(
    `Scheduled externally: ${scheduler.scheduledExternally ? "✅ YES" : "❌ NO"}`
  );
  if (scheduler.message) {
    console.log(`Message: ${scheduler.message}`);
  }
  console.log(`In-process running: ${scheduler.isRunning ? "✅ YES" : "❌ NO"}`);

  console.log("\n🔧 Environment:");
  console.log("===============");
  console.log(`Node env: ${environment.nodeEnv ?? "—"}`);
  console.log(
    `Cron secret configured: ${environment.cronSecretConfigured ? "✅ YES" : "❌ NO"}`
  );
  console.log(`Campaign IDs: ${environment.campaignIds ?? "—"}`);

  console.log("\n💡 Tips:");
  console.log("========");
  if (scheduler.scheduledExternally) {
    console.log("- Cron jobs are run by Coolify scheduled tasks (e.g. curl to /api/cron/*)");
    console.log("- Trigger lead polling manually: POST /api/dev/scheduler-status with { \"action\": \"poll\" }");
    console.log("- Or use admin UI to trigger polling");
  } else {
    console.log("- Check CRON_SECRET is set if calling cron endpoints");
  }

  console.log("\n🧪 Manual trigger:");
  console.log("==================");
  console.log("- POST to /api/dev/scheduler-status with body: { \"action\": \"poll\" }");
  console.log("- Or call cron endpoints with x-cron-secret header (e.g. from Coolify)");
} catch (error) {
  console.error("❌ Network error:", error.message);
  console.log("\n💡 Make sure the app is running (e.g. yarn dev)");
  process.exit(1);
}
