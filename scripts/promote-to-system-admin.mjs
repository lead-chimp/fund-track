#!/usr/bin/env node

/**
 * Script to promote a user to SYSTEM_ADMIN role
 * Usage: node scripts/promote-to-system-admin.mjs <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteToSystemAdmin(email) {
    try {
        // Find the user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error(`❌ User with email "${email}" not found`);
            process.exit(1);
        }

        console.log(`📋 Current user details:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Current Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);

        if (user.role === 'SYSTEM_ADMIN') {
            console.log(`✅ User is already a SYSTEM_ADMIN`);
            return;
        }

        // Promote to SYSTEM_ADMIN
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: 'SYSTEM_ADMIN' }
        });

        console.log(`✅ Successfully promoted user to SYSTEM_ADMIN`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   New Role: ${updatedUser.role}`);
        console.log(`   Updated: ${updatedUser.updatedAt.toISOString()}`);

    } catch (error) {
        console.error('❌ Error promoting user:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/promote-to-system-admin.mjs <email>');
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.error('❌ Please provide a valid email address');
    process.exit(1);
}

console.log(`🔄 Promoting user "${email}" to SYSTEM_ADMIN role...`);
promoteToSystemAdmin(email);