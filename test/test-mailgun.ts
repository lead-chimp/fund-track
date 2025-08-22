#!/usr/bin/env tsx

/**
 * Temporary MailGun Test Script (TypeScript)
 *
 * This script tests MailGun email functionality using the NotificationService.
 * Run with: npx tsx test-mailgun.ts
 */

import { notificationService } from "../src/services/NotificationService";
import type { EmailNotification } from "../src/services/NotificationService";

// Test email configuration
const TEST_EMAIL = "ardabasoglu@gmail.com";

// Generate test intake URL
const TEST_INTAKE_TOKEN = "test-token-" + Date.now();
const TEST_INTAKE_URL = `${
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}/application/${TEST_INTAKE_TOKEN}`;

const testNotifications: EmailNotification[] = [
  // 1. Basic Integration Test
  {
    to: TEST_EMAIL,
    subject: "Fund Track - MailGun Integration Test",
    text: "This is a basic text email test from Merchant Funding application.",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Fund Track - MailGun Test</h2>
        <p>This is a test email to verify MailGun integration is working correctly.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #374151;">Test Details:</h3>
          <ul style="color: #6b7280;">
            <li>Service: MailGun API</li>
            <li>Application: Fund Track</li>
            <li>Environment: ${process.env.NODE_ENV || "development"}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
        </div>
        
        <p style="color: #059669;">✅ If you receive this email, MailGun integration is working!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="font-size: 12px; color: #9ca3af;">
          This is an automated test email from Fund Track application.
        </p>
      </div>
    `,
  },

  // 2. Initial Intake Notification (from poll-leads/route.ts and BackgroundJobScheduler.ts)
  {
    to: TEST_EMAIL,
    subject: "Complete Your MerchantFund Application",
    text: `Hi John Doe,

Thank you for your interest in merchant funding. Please complete your application by clicking the link below:

${TEST_INTAKE_URL}

This secure link will allow you to provide the required information and upload necessary documents.

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
    html: `
      <h2>Complete Your MerchantFund Application</h2>
      <p>Hi John Doe,</p>
      <p>Thank you for your interest in merchant funding. Please complete your application by clicking the link below:</p>
      <p><a href="${TEST_INTAKE_URL}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Application</a></p>
      <p>This secure link will allow you to provide the required information and upload necessary documents.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Merchant Funding Team</p>
    `,
  },

  // 3. Enhanced Initial Intake (from notifications.ts)
  {
    to: TEST_EMAIL,
    subject: "Complete Your MerchantFund Application",
    text: `Hi Jane Smith,

Thank you for your interest in merchant funding for ABC Business LLC. To complete your application, please click the link below:

${TEST_INTAKE_URL}

This secure link will allow you to:
- Review and confirm your information
- Upload required documents
- Complete your application

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Complete Your MerchantFund Application</h2>
        <p>Hi Jane Smith,</p>
        <p>Thank you for your interest in merchant funding for ABC Business LLC. To complete your application, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${TEST_INTAKE_URL}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Application</a>
        </div>
        <p>This secure link will allow you to:</p>
        <ul>
          <li>Review and confirm your information</li>
          <li>Upload required documents</li>
          <li>Complete your application</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Merchant Funding Team</p>
      </div>
    `,
  },

  // 4. 3-Hour Follow-up (from FollowUpScheduler.ts)
  {
    to: TEST_EMAIL,
    subject: "Quick Reminder: Complete Your MerchantFund Application",
    text: `Hi Mike Johnson,

We wanted to follow up quickly your merchant funding application that you started just a few hours ago.

Complete your application now: ${TEST_INTAKE_URL}

Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
    html: `
      <h2>Quick Reminder: Complete Your MerchantFund Application</h2>
      <p>Hi Mike Johnson,</p>
      <p>We wanted to follow up quickly your merchant funding application that you started just a few hours ago.</p>
      <p><a href="${TEST_INTAKE_URL}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Application Now</a></p>
      <p>Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Merchant Funding Team</p>
    `,
  },

  // 5. 24-Hour Follow-up (from FollowUpScheduler.ts)
  {
    to: TEST_EMAIL,
    subject: "Final Reminder: Complete Your Application Today",
    text: `Hi Sarah Wilson,

This is a friendly reminder your merchant funding application that you started yesterday.

Complete your application now: ${TEST_INTAKE_URL}

Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
    html: `
      <h2>Final Reminder: Complete Your Application Today</h2>
      <p>Hi Sarah Wilson,</p>
      <p>This is a friendly reminder your merchant funding application that you started yesterday.</p>
      <p><a href="${TEST_INTAKE_URL}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Application Now</a></p>
      <p>Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Merchant Funding Team</p>
    `,
  },

  // 6. 72-Hour Final Follow-up (from FollowUpScheduler.ts)
  {
    to: TEST_EMAIL,
    subject: "Last Chance: Your Fund Track Application Expires Soon",
    text: `Hi Robert Davis,

This is your final reminder your merchant funding application that you started a few days ago.

Complete your application now: ${TEST_INTAKE_URL}

Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
    html: `
      <h2>Last Chance: Your Fund Track Application Expires Soon</h2>
      <p>Hi Robert Davis,</p>
      <p>This is your final reminder your merchant funding application that you started a few days ago.</p>
      <p><a href="${TEST_INTAKE_URL}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Application Now</a></p>
      <p>Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Merchant Funding Team</p>
    `,
  },

  // 7. General Follow-up Reminder (from notifications.ts)
  {
    to: TEST_EMAIL,
    subject: "Reminder: Complete Your MerchantFund Application",
    text: `Hi Lisa Brown,

We noticed you started your merchant funding application but haven't finished yet.

Complete your application here: ${TEST_INTAKE_URL}

This will only take a few minutes and you can save your progress at any time.

Best regards,
Merchant Funding Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reminder: Complete Your Application</h2>
        <p>Hi Lisa Brown,</p>
        <p>We noticed you started your merchant funding application but haven't finished yet.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${TEST_INTAKE_URL}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Now</a>
        </div>
        <p>This will only take a few minutes and you can save your progress at any time.</p>
        <p>Best regards,<br>Merchant Funding Team</p>
      </div>
    `,
  },
];

// Helper function to get descriptive test names
function getTestName(testNumber: number): string {
  const testNames = [
    "Basic Integration Test",
    "Initial Intake Notification (Basic)",
    "Initial Intake Notification (Enhanced)",
    "3-Hour Follow-up Reminder",
    "24-Hour Follow-up Reminder",
    "72-Hour Final Follow-up",
    "General Follow-up Reminder",
  ];

  return testNames[testNumber - 1] || `Test ${testNumber}`;
}

async function runMailgunTests() {
  console.log("🚀 Fund Track - MailGun Integration Test");
  console.log("=========================================\n");

  // Validate test email format
  if (!TEST_EMAIL || !TEST_EMAIL.includes("@")) {
    console.error(
      "❌ Please set a valid TEST_EMAIL constant in this script before running."
    );
    console.error(`   Current value: ${TEST_EMAIL}\n`);
    process.exit(1);
  }

  try {
    // Validate configuration first
    console.log("🔧 Validating NotificationService configuration...");
    const isValid = await notificationService.validateConfiguration();

    if (!isValid) {
      console.error("❌ NotificationService configuration is invalid.");
      console.error("   Check your environment variables in .env.local\n");
      process.exit(1);
    }

    console.log("✅ Configuration is valid\n");

    // Test each notification
    const testResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      const testName = getTestName(i + 1);

      console.log(`📧 Test ${i + 1}/${testNotifications.length}: ${testName}`);
      console.log(`   Subject: ${notification.subject}`);

      try {
        const result = await notificationService.sendEmail(notification);

        if (result.success) {
          console.log(`   ✅ Success - Message ID: ${result.externalId}`);
          testResults.successful++;
        } else {
          console.log(`   ❌ Failed - Error: ${result.error}`);
          testResults.failed++;
          testResults.errors.push(`${testName}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        console.log(`   💥 Exception: ${errorMsg}`);
        testResults.failed++;
        testResults.errors.push(`${testName}: ${errorMsg}`);
      }

      // Small delay between tests to avoid rate limiting
      if (i < testNotifications.length - 1) {
        console.log("   ⏳ Waiting 3 seconds before next test...\n");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Summary
    console.log("\n📊 Test Summary:");
    console.log(`   ✅ Successful: ${testResults.successful}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📧 Total Tests: ${testNotifications.length}`);

    if (testResults.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Get recent notification logs
    console.log("\n📊 Recent notification logs:");
    try {
      const recentLogs = await notificationService.getRecentNotifications(5);

      if (recentLogs.length === 0) {
        console.log("   No recent notifications found");
      } else {
        recentLogs.forEach((log, index) => {
          console.log(
            `   ${index + 1}. ${log.type} to ${log.recipient} - ${log.status}`
          );
          if (log.errorMessage) {
            console.log(`      Error: ${log.errorMessage}`);
          }
        });
      }
    } catch (error) {
      console.log(
        `   ⚠️  Could not fetch logs: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  } catch (error) {
    console.error("\n💥 Test failed with unexpected error:");
    console.error(error);
    process.exit(1);
  }
}

// Environment check
function checkEnvironment() {
  const requiredVars = [
    "MAILGUN_API_KEY",
    "MAILGUN_DOMAIN",
    "MAILGUN_FROM_EMAIL",
  ];

  console.log("🔍 Environment Check:");
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? "✅ Set" : "❌ Missing"}`);
  });

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables: ${missing.join(", ")}`
    );
    console.error("   Make sure your .env.local file contains these values.\n");
    return false;
  }

  console.log("");
  return true;
}

// Run the tests
if (require.main === module) {
  if (!checkEnvironment()) {
    process.exit(1);
  }

  runMailgunTests()
    .then(() => {
      console.log("\n🎉 MailGun tests completed!");
      console.log("   Check your email inbox for test messages.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Tests failed:", error);
      process.exit(1);
    });
}

export { runMailgunTests };
