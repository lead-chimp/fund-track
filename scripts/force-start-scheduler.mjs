#!/usr/bin/env node

/**
 * Direct script to force start the background job scheduler
 * This bypasses the web API and directly imports the scheduler
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function forceStartScheduler() {
  try {
    console.log('🚀 Force starting background job scheduler...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔧 Background jobs enabled:', process.env.ENABLE_BACKGROUND_JOBS);
    
    // Import the scheduler (using dynamic import for ES modules)
    const { backgroundJobScheduler } = await import('../src/services/BackgroundJobScheduler.js');
    
    // Get current status
    const statusBefore = backgroundJobScheduler.getStatus();
    console.log('📊 Current status:', JSON.stringify(statusBefore, null, 2));
    
    if (statusBefore.isRunning) {
      console.log('✅ Scheduler is already running');
      
      // Test lead polling manually
      console.log('🧪 Testing manual lead polling...');
      await backgroundJobScheduler.executeLeadPollingManually();
      console.log('✅ Manual lead polling completed');
      
      return;
    }
    
    // Force start the scheduler
    console.log('🔧 Force starting scheduler...');
    backgroundJobScheduler.start();
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get status after starting
    const statusAfter = backgroundJobScheduler.getStatus();
    console.log('📊 Status after start:', JSON.stringify(statusAfter, null, 2));
    
    if (statusAfter.isRunning) {
      console.log('✅ Background job scheduler started successfully!');
      console.log(`📅 Lead polling pattern: ${statusAfter.leadPollingPattern}`);
      console.log(`📅 Follow-up pattern: ${statusAfter.followUpPattern}`);
      
      // Test manual execution
      console.log('🧪 Testing manual lead polling...');
      await backgroundJobScheduler.executeLeadPollingManually();
      console.log('✅ Manual lead polling completed');
      
    } else {
      console.log('❌ Failed to start scheduler');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error starting scheduler:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, exiting...');
  process.exit(0);
});

forceStartScheduler();