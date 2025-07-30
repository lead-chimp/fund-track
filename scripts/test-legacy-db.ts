#!/usr/bin/env tsx

/**
 * Test script for legacy database connection
 * Usage: npx tsx scripts/test-legacy-db.ts
 */

import { getLegacyDatabase } from '../src/lib/legacy-db';
import { createLeadPoller } from '../src/services/LeadPoller';

async function testLegacyConnection() {
  console.log('Testing legacy database connection...');
  
  const legacyDb = getLegacyDatabase();
  
  try {
    // Test basic connection
    const isConnected = await legacyDb.testConnection();
    
    if (isConnected) {
      console.log('✅ Legacy database connection successful');
      
      // Test basic query
      console.log('Testing basic query...');
      const result = await legacyDb.query('SELECT TOP 1 * FROM Leads');
      console.log(`✅ Query successful, found ${result.length} record(s)`);
      
      if (result.length > 0) {
        console.log('Sample record:', result[0]);
      }
      
    } else {
      console.log('❌ Legacy database connection failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing legacy database:', error);
  } finally {
    await legacyDb.disconnect();
  }
}

async function testLeadPoller() {
  console.log('\nTesting LeadPoller service...');
  
  try {
    const leadPoller = createLeadPoller();
    console.log('✅ LeadPoller created successfully');
    
    // Note: This would actually poll the database, so we'll just test creation
    console.log('LeadPoller is ready to poll leads');
    
  } catch (error) {
    console.error('❌ Error creating LeadPoller:', error);
  }
}

async function main() {
  console.log('Legacy Database Integration Test');
  console.log('================================\n');
  
  // Check environment variables
  const requiredEnvVars = [
    'LEGACY_DB_SERVER',
    'LEGACY_DB_DATABASE',
    'LEGACY_DB_USER',
    'LEGACY_DB_PASSWORD',
    'MERCHANT_FUNDING_CAMPAIGN_IDS'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nPlease set these variables in your .env.local file');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set\n');
  
  await testLegacyConnection();
  await testLeadPoller();
  
  console.log('\nTest completed!');
}

if (require.main === module) {
  main().catch(console.error);
}