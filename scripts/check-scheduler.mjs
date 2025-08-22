#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Script to check background job scheduler status
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/dev/scheduler-status`;

console.log('🔍 Checking Background Job Scheduler Status...\n');

try {
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.log('❌ Error:', data.error);
    if (data.details) {
      console.log('Details:', data.details);
    }
    process.exit(1);
  }

  console.log('📊 Scheduler Status:');
  console.log('==================');
  console.log(`Running: ${data.scheduler.isRunning ? '✅ YES' : '❌ NO'}`);
  console.log(`Lead Polling Pattern: ${data.scheduler.leadPollingPattern}`);
  console.log(`Follow-up Pattern: ${data.scheduler.followUpPattern}`);
  
  if (data.scheduler.nextLeadPolling) {
    const nextPolling = new Date(data.scheduler.nextLeadPolling);
    const now = new Date();
    const minutesUntil = Math.round((nextPolling - now) / (1000 * 60));
    console.log(`Next Lead Polling: ${nextPolling.toLocaleString()} (in ${minutesUntil} minutes)`);
  }
  
  if (data.scheduler.nextFollowUp) {
    const nextFollowUp = new Date(data.scheduler.nextFollowUp);
    const now = new Date();
    const minutesUntil = Math.round((nextFollowUp - now) / (1000 * 60));
    console.log(`Next Follow-up: ${nextFollowUp.toLocaleString()} (in ${minutesUntil} minutes)`);
  }

  console.log('\n🔧 Environment Configuration:');
  console.log('=============================');
  console.log(`Node Environment: ${data.environment.nodeEnv}`);
  console.log(`Background Jobs Enabled: ${data.environment.backgroundJobsEnabled}`);
  console.log(`Lead Polling Pattern: ${data.environment.leadPollingPattern}`);
  console.log(`Campaign IDs: ${data.environment.campaignIds}`);

  console.log('\n💡 Tips:');
  console.log('========');
  if (!data.scheduler.isRunning) {
    console.log('- Scheduler is not running. Check if ENABLE_BACKGROUND_JOBS=true in your .env file');
    console.log('- Restart your development server after changing environment variables');
  } else {
    console.log('- Scheduler is running and will automatically poll for leads');
    console.log('- Lead polling runs every 15 minutes by default');
    console.log('- Check your console logs for background job activity');
  }

  console.log('\n🧪 Manual Testing:');
  console.log('==================');
  console.log('- Use the web interface at /dev/test-legacy-db');
  console.log('- Run: node scripts/test-lead-polling.mjs poll');
  console.log('- POST to /api/dev/scheduler-status to trigger manual polling');

} catch (error) {
  console.error('❌ Network error:', error.message);
  console.log('\n💡 Make sure your development server is running on http://localhost:3000');
  process.exit(1);
}