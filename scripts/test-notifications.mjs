#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simple CLI script for testing notifications
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage: node scripts/test-notifications.mjs <command> [options]

Commands:
  email <recipient> <subject> <message> [leadId]
  sms <recipient> <message> [leadId]

Examples:
  node scripts/test-notifications.mjs email "test@example.com" "Test Subject" "Test message"
  node scripts/test-notifications.mjs sms "+1234567890" "Test SMS message"
  node scripts/test-notifications.mjs email "test@example.com" "Test" "Message" 123

Environment variables required:
  - For Email: MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL
  - For SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
`);
  process.exit(1);
}

const [command, recipient, ...rest] = args;

if (!['email', 'sms'].includes(command)) {
  console.error('Error: Command must be either "email" or "sms"');
  process.exit(1);
}

if (!recipient) {
  console.error('Error: Recipient is required');
  process.exit(1);
}

let payload;

if (command === 'email') {
  const [subject, message, leadId] = rest;
  if (!subject || !message) {
    console.error('Error: Subject and message are required for email');
    process.exit(1);
  }
  payload = {
    type: 'email',
    recipient,
    subject,
    message,
    leadId: leadId ? parseInt(leadId) : undefined,
  };
} else {
  const [message, leadId] = rest;
  if (!message) {
    console.error('Error: Message is required for SMS');
    process.exit(1);
  }
  payload = {
    type: 'sms',
    recipient,
    message,
    leadId: leadId ? parseInt(leadId) : undefined,
  };
}

// Make the API call
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/dev/test-notifications`;

console.log(`Sending ${command} to ${recipient}...`);
console.log('Payload:', JSON.stringify(payload, null, 2));

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Success!');
    console.log(`External ID: ${result.externalId}`);
    console.log(`Timestamp: ${result.timestamp}`);
  } else {
    console.log('❌ Failed!');
    console.log(`Error: ${result.error}`);
    if (result.details) {
      console.log(`Details: ${result.details}`);
    }
  }
} catch (error) {
  console.error('❌ Network error:', error.message);
  process.exit(1);
}