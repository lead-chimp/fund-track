#!/usr/bin/env node

/**
 * Environment validation script for Backblaze B2 configuration
 * This script validates that all required B2 environment variables are present and valid
 */

// Load environment variables from .env files
import { readFileSync } from 'fs';
import { join } from 'path';

// Simple env file parser
function loadEnvFile(filename) {
  try {
    const envFile = readFileSync(filename, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    // File doesn't exist or can't be read, that's okay
  }
}

// Load environment files in order of precedence
loadEnvFile('.env.local');
loadEnvFile('.env.production');
loadEnvFile('.env');

console.log('🔧 Validating Backblaze B2 Environment Configuration');
console.log('===================================================');

const requiredEnvVars = [
  'B2_APPLICATION_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_NAME',
  'B2_BUCKET_ID'
];

let allValid = true;

console.log('\n📋 Checking required environment variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: Missing`);
    allValid = false;
  } else {
    // Mask sensitive values for display
    const displayValue = varName.includes('KEY') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n🔍 Validating B2 configuration format:');

// Validate Application Key ID format (should start with specific pattern)
const keyId = process.env.B2_APPLICATION_KEY_ID;
if (keyId) {
  if (keyId.length >= 20 && /^[0-9a-f]+$/.test(keyId)) {
    console.log('✅ B2_APPLICATION_KEY_ID: Valid format');
  } else {
    console.log('❌ B2_APPLICATION_KEY_ID: Invalid format (should be hex string, 20+ chars)');
    allValid = false;
  }
}

// Validate Application Key format
const appKey = process.env.B2_APPLICATION_KEY;
if (appKey) {
  if (appKey.length >= 30 && /^[A-Za-z0-9]+$/.test(appKey)) {
    console.log('✅ B2_APPLICATION_KEY: Valid format');
  } else {
    console.log('❌ B2_APPLICATION_KEY: Invalid format (should be alphanumeric, 30+ chars)');
    allValid = false;
  }
}

// Validate Bucket ID format
const bucketId = process.env.B2_BUCKET_ID;
if (bucketId) {
  if (bucketId.length >= 20 && /^[0-9a-f]+$/.test(bucketId)) {
    console.log('✅ B2_BUCKET_ID: Valid format');
  } else {
    console.log('❌ B2_BUCKET_ID: Invalid format (should be hex string, 20+ chars)');
    allValid = false;
  }
}

// Validate Bucket Name format
const bucketName = process.env.B2_BUCKET_NAME;
if (bucketName) {
  if (/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(bucketName) && bucketName.length >= 6 && bucketName.length <= 50) {
    console.log('✅ B2_BUCKET_NAME: Valid format');
  } else {
    console.log('❌ B2_BUCKET_NAME: Invalid format (should be lowercase, 6-50 chars, alphanumeric with hyphens)');
    allValid = false;
  }
}

console.log('\n📊 Environment Summary:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'not set'}`);

if (allValid) {
  console.log('\n🎉 All B2 environment variables are valid!');
  console.log('\n💡 Next steps:');
  console.log('   1. Test the B2 connection: node scripts/test-b2-connection.mjs');
  console.log('   2. Deploy the application with the updated FileUploadService');
  console.log('   3. Monitor B2 operations: ./scripts/monitor-b2-operations.sh -f');
  process.exit(0);
} else {
  console.log('\n❌ Some B2 environment variables are missing or invalid.');
  console.log('\n🔧 Please check your .env.production file and ensure all B2 variables are correctly set.');
  process.exit(1);
}