#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simple CLI script for testing lead polling
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage: node scripts/test-lead-polling.mjs <command>

Commands:
  poll      - Trigger test lead polling for campaign 11302
  status    - Get test poller status

Examples:
  node scripts/test-lead-polling.mjs poll
  node scripts/test-lead-polling.mjs status

This script uses a test poller configured for campaign ID 11302 (the test record campaign).
`);
  process.exit(1);
}

const [command] = args;

if (!['poll', 'status'].includes(command)) {
  console.error('Error: Command must be "poll" or "status"');
  process.exit(1);
}

// Make the API call
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/dev/test-lead-polling`;

console.log(`Executing ${command} operation...`);

try {
  let response;
  
  if (command === 'status') {
    response = await fetch(url, {
      method: 'GET',
    });
  } else {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: command,
      }),
    });
  }

  const result = await response.json();

  if (command === 'status') {
    console.log('📊 Test Poller Status:');
    console.log('====================');
    console.log(`Campaign IDs: ${result.campaignIds?.join(', ') || 'N/A'}`);
    console.log(`Batch Size: ${result.batchSize || 'N/A'}`);
    console.log(`Available Actions: ${result.availableActions?.join(', ') || 'N/A'}`);
    
    if (result.usage) {
      console.log('\n📖 Usage:');
      Object.entries(result.usage).forEach(([action, description]) => {
        console.log(`  ${action}: ${description}`);
      });
    }
  } else {
    if (result.success) {
      console.log('✅ Success!');
      console.log(`Action: ${result.action}`);
      console.log(`Timestamp: ${result.timestamp}`);
      
      if (result.result) {
        console.log('\n📊 Polling Results:');
        console.log(`Total Processed: ${result.result.totalProcessed || 0}`);
        console.log(`New Leads: ${result.result.newLeads || 0}`);
        console.log(`Duplicates Skipped: ${result.result.duplicatesSkipped || 0}`);
        console.log(`Errors: ${result.result.errors?.length || 0}`);
        console.log(`Processing Time: ${result.result.processingTime || 0}ms`);
        
        if (result.result.errors && result.result.errors.length > 0) {
          console.log('\n❌ Errors:');
          result.result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
        }
      }
    } else {
      console.log('❌ Failed!');
      console.log(`Error: ${result.error}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }
  }
} catch (error) {
  console.error('❌ Network error:', error.message);
  process.exit(1);
}