#!/usr/bin/env node

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Simple CLI script for testing legacy database operations
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage: node scripts/test-legacy-db.mjs <command>

Commands:
  insert    - Insert a test record into legacy database
  delete    - Delete test records from legacy database and cleanup app records
  cleanup   - Cleanup related records from app database only
  status    - Check current test records in both databases

Examples:
  node scripts/test-legacy-db.mjs insert
  node scripts/test-legacy-db.mjs delete
  node scripts/test-legacy-db.mjs cleanup
  node scripts/test-legacy-db.mjs status

Environment variables required:
  - LEGACY_DB_SERVER, LEGACY_DB_DATABASE, LEGACY_DB_USER, LEGACY_DB_PASSWORD
`);
  process.exit(1);
}

const [command] = args;

if (!["insert", "delete", "cleanup", "status"].includes(command)) {
  console.error(
    'Error: Command must be "insert", "delete", "cleanup", or "status"',
  );
  process.exit(1);
}

// Make the API call
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const url = `${baseUrl}/api/dev/test-legacy-db`;

console.log(`Executing ${command} operation...`);

try {
  let response;

  if (command === "status") {
    response = await fetch(url, {
      method: "GET",
    });
  } else {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: command,
      }),
    });
  }

  const result = await response.json();

  if (command === "status") {
    console.log("[Legacy DB Test] Current Status:");
    console.log("================");
    console.log(
      `Legacy Database Records: ${result.existingLegacyRecords?.length || 0}`,
    );
    console.log(
      `App Database Records: ${result.relatedAppRecords?.length || 0}`,
    );

    if (result.existingLegacyRecords?.length > 0) {
      console.log("\n[Legacy DB Test] Legacy Records:");
      result.existingLegacyRecords.forEach((record, index) => {
        console.log(
          `  ${index + 1}. Lead ID: ${record.LeadID}, Campaign: ${record.CampaignID}, Created: ${new Date(record.PostDT).toLocaleString()}`,
        );
      });
    }

    if (result.relatedAppRecords?.length > 0) {
      console.log("\n[Legacy DB Test] App Records:");
      result.relatedAppRecords.forEach((record, index) => {
        console.log(
          `  ${index + 1}. App ID: ${record.id}, Legacy ID: ${record.legacyLeadId}, Status: ${record.status}`,
        );
      });
    }
  } else {
    if (result.success) {
      console.log("[Legacy DB Test] Success!");
      console.log(`Action: ${result.action}`);
      console.log(`Timestamp: ${result.timestamp}`);

      if (result.result) {
        console.log("\nResult Details:");
        console.log(JSON.stringify(result.result, null, 2));
      }
    } else {
      console.log("[Legacy DB Test] Failed!");
      console.log(`Error: ${result.error}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }
  }
} catch (error) {
  console.error("❌ Network error:", error.message);
  process.exit(1);
}
