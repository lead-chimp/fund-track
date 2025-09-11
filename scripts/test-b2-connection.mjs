#!/usr/bin/env node

/**
 * Test script to verify Backblaze B2 connection and authorization
 * This script tests the FileUploadService with the new retry logic
 */

import { fileUploadService } from '../src/services/FileUploadService.js';

async function testB2Connection() {
  console.log('🔧 Testing Backblaze B2 connection...');
  
  try {
    // Test initialization
    console.log('📡 Testing B2 authorization...');
    await fileUploadService.initialize();
    console.log('✅ B2 authorization successful');
    
    // Test listing files for a lead (this will test the download authorization)
    console.log('📂 Testing file listing...');
    const files = await fileUploadService.listFilesForLead(963); // Using the lead ID from the error
    console.log(`✅ File listing successful. Found ${files.length} files for lead 963`);
    
    if (files.length > 0) {
      console.log('📄 Sample files:');
      files.slice(0, 3).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.fileName} (${file.fileId})`);
      });
      
      // Test download URL generation for the first file
      const firstFile = files[0];
      if (firstFile) {
        console.log(`🔗 Testing download URL generation for: ${firstFile.fileName}`);
        const downloadResult = await fileUploadService.getDownloadUrl(
          firstFile.fileId,
          firstFile.fileName,
          1 // 1 hour expiration for testing
        );
        console.log('✅ Download URL generated successfully');
        console.log(`   Expires at: ${downloadResult.expiresAt.toISOString()}`);
        console.log(`   URL length: ${downloadResult.downloadUrl.length} characters`);
      }
    }
    
    console.log('🎉 All B2 tests passed successfully!');
    
  } catch (error) {
    console.error('❌ B2 connection test failed:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run the test
testB2Connection().catch(console.error);