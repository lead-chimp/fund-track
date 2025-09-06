#!/usr/bin/env node

/**
 * Script to clear all sessions for a specific user
 * This forces the user to log back in with fresh JWT token
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUserSessions(email) {
    try {
        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                role: true
            }
        });

        if (!user) {
            console.error(`❌ User with email "${email}" not found`);
            process.exit(1);
        }

        console.log(`👤 Found user: ${user.email} (Role: ${user.role})`);

        // Count existing sessions
        const sessionCount = await prisma.session.count({
            where: { userId: user.id }
        });

        console.log(`🔐 Found ${sessionCount} active session(s)`);

        if (sessionCount === 0) {
            console.log('✅ No sessions to clear');
            return;
        }

        // Clear all sessions for this user
        const result = await prisma.session.deleteMany({
            where: { userId: user.id }
        });

        console.log(`✅ Cleared ${result.count} session(s) for ${user.email}`);
        console.log('💡 User will need to log in again to access the application');

    } catch (error) {
        console.error('❌ Error clearing user sessions:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/clear-user-sessions.mjs <email>');
    process.exit(1);
}

console.log(`🧹 Clearing sessions for "${email}"...\n`);
clearUserSessions(email);