#!/usr/bin/env node

/**
 * Script to manually start the background job scheduler
 * This is useful for debugging scheduler issues in production
 */

import { backgroundJobScheduler } from '../src/services/BackgroundJobScheduler.js';
import { logger } from '../src/lib/logger.js';

async function startScheduler() {
  try {
    console.log('🚀 Starting background job scheduler...');
    
    // Get current status
    const statusBefore = backgroundJobScheduler.getStatus();
    console.log('📊 Current status:', JSON.stringify(statusBefore, null, 2));
    
    if (statusBefore.isRunning) {
      console.log('✅ Scheduler is already running');
      return;
    }
    
    // Start the scheduler
    backgroundJobScheduler.start();
    
    // Get status after starting
    const statusAfter = backgroundJobScheduler.getStatus();
    console.log('📊 Status after start:', JSON.stringify(statusAfter, null, 2));
    
    if (statusAfter.isRunning) {
      console.log('✅ Background job scheduler started successfully!');
      console.log(`📅 Next lead polling: ${statusAfter.nextLeadPolling}`);
      console.log(`📅 Next follow-up: ${statusAfter.nextFollowUp}`);
    } else {
      console.log('❌ Failed to start scheduler');
    }
    
  } catch (error) {
    console.error('❌ Error starting scheduler:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping scheduler...');
  backgroundJobScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping scheduler...');
  backgroundJobScheduler.stop();
  process.exit(0);
});

startScheduler();