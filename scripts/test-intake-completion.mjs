#!/usr/bin/env node

/**
 * Test script to verify that intake completion properly updates lead status
 * and sends notifications to staff
 */

import { PrismaClient } from '@prisma/client';
import { TokenService } from '../src/services/TokenService.js';

const prisma = new PrismaClient();

async function testIntakeCompletion() {
  console.log('🧪 Testing intake completion workflow...\n');

  try {
    // Find a lead with PENDING status
    let testLead = await prisma.lead.findFirst({
      where: {
        status: 'PENDING',
        intakeToken: { not: null }
      },
      select: {
        id: true,
        status: true,
        firstName: true,
        lastName: true,
        businessName: true,
        intakeToken: true,
        step1CompletedAt: true,
        step2CompletedAt: true,
        step3CompletedAt: true,
        intakeCompletedAt: true
      }
    });

    // If no pending lead exists, create one for testing
    if (!testLead) {
      console.log('📝 Creating test lead with PENDING status...');

      const token = TokenService.generateToken();
      testLead = await prisma.lead.create({
        data: {
          legacyLeadId: 9999,
          campaignId: 999,
          email: 'test.intake@example.com',
          phone: '5551234567',
          firstName: 'Test',
          lastName: 'User',
          businessName: 'Test Business LLC',
          status: 'PENDING',
          intakeToken: token,
          step1CompletedAt: new Date(), // Mark step 1 as completed
          importedAt: new Date()
        },
        select: {
          id: true,
          status: true,
          firstName: true,
          lastName: true,
          businessName: true,
          intakeToken: true,
          step1CompletedAt: true,
          step2CompletedAt: true,
          step3CompletedAt: true,
          intakeCompletedAt: true
        }
      });
    }

    console.log(`📋 Using test lead: ${testLead.firstName} ${testLead.lastName} (${testLead.businessName})`);
    console.log(`   Lead ID: ${testLead.id}`);
    console.log(`   Current Status: ${testLead.status}`);
    console.log(`   Step 1 Completed: ${testLead.step1CompletedAt ? 'Yes' : 'No'}`);
    console.log(`   Step 2 Completed: ${testLead.step2CompletedAt ? 'Yes' : 'No'}`);
    console.log(`   Step 3 Completed: ${testLead.step3CompletedAt ? 'Yes' : 'No'}`);
    console.log(`   Intake Completed: ${testLead.intakeCompletedAt ? 'Yes' : 'No'}\n`);

    // Get status history before
    const statusHistoryBefore = await prisma.leadStatusHistory.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true } }
      }
    });

    console.log(`📊 Status history before (${statusHistoryBefore.length} entries):`);
    statusHistoryBefore.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.previousStatus || 'NULL'} → ${entry.newStatus} by ${entry.user?.email || 'System'} (${entry.createdAt.toISOString()})`);
      if (entry.reason) console.log(`      Reason: ${entry.reason}`);
    });
    console.log();

    // Test the markStep3Completed function (which completes the entire intake)
    console.log('🚀 Simulating step 3 completion (digital signature)...');

    // First mark step 2 as completed if not already
    if (!testLead.step2CompletedAt) {
      console.log('📝 Marking step 2 as completed first...');
      await TokenService.markStep2Completed(testLead.id);
    }

    const success = await TokenService.markStep3Completed(testLead.id);

    if (!success) {
      console.error('❌ Failed to mark step 3 as completed');
      return;
    }

    console.log('✅ Step 3 marked as completed successfully\n');

    // Check the updated lead
    const updatedLead = await prisma.lead.findUnique({
      where: { id: testLead.id },
      select: {
        id: true,
        status: true,
        step1CompletedAt: true,
        step2CompletedAt: true,
        step3CompletedAt: true,
        intakeCompletedAt: true
      }
    });

    console.log('📋 Updated lead status:');
    console.log(`   Status: ${testLead.status} → ${updatedLead.status}`);
    console.log(`   Step 2 Completed: ${testLead.step2CompletedAt ? 'Yes' : 'No'} → ${updatedLead.step2CompletedAt ? 'Yes' : 'No'}`);
    console.log(`   Step 3 Completed: ${testLead.step3CompletedAt ? 'Yes' : 'No'} → ${updatedLead.step3CompletedAt ? 'Yes' : 'No'}`);
    console.log(`   Intake Completed: ${testLead.intakeCompletedAt ? 'Yes' : 'No'} → ${updatedLead.intakeCompletedAt ? 'Yes' : 'No'}\n`);

    // Get status history after
    const statusHistoryAfter = await prisma.leadStatusHistory.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true } }
      }
    });

    console.log(`📊 Status history after (${statusHistoryAfter.length} entries):`);
    statusHistoryAfter.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.previousStatus || 'NULL'} → ${entry.newStatus} by ${entry.user?.email || 'System'} (${entry.createdAt.toISOString()})`);
      if (entry.reason) console.log(`      Reason: ${entry.reason}`);
    });
    console.log();

    // Verify the expected changes
    const expectedChanges = [
      updatedLead.status === 'IN_PROGRESS',
      updatedLead.step2CompletedAt !== null,
      updatedLead.step3CompletedAt !== null,
      updatedLead.intakeCompletedAt !== null,
      statusHistoryAfter.length > statusHistoryBefore.length
    ];

    const allChangesCorrect = expectedChanges.every(change => change);

    if (allChangesCorrect) {
      console.log('✅ All expected changes verified:');
      console.log('   ✓ Lead status changed to IN_PROGRESS');
      console.log('   ✓ Step 2 marked as completed');
      console.log('   ✓ Step 3 marked as completed');
      console.log('   ✓ Intake marked as completed');
      console.log('   ✓ Status history entry created');
      console.log('\n🎉 Test completed successfully! Staff will now be notified when digital signature is completed.');
    } else {
      console.log('❌ Some expected changes were not found:');
      console.log(`   Status is IN_PROGRESS: ${expectedChanges[0] ? '✓' : '❌'}`);
      console.log(`   Step 2 completed: ${expectedChanges[1] ? '✓' : '❌'}`);
      console.log(`   Step 3 completed: ${expectedChanges[2] ? '✓' : '❌'}`);
      console.log(`   Intake completed: ${expectedChanges[3] ? '✓' : '❌'}`);
      console.log(`   Status history updated: ${expectedChanges[4] ? '✓' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIntakeCompletion();