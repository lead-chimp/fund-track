#!/usr/bin/env node

/**
 * Script to reset a user's password
 * Usage: node scripts/reset-user-password.mjs <email> <newPassword>
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function resetUserPassword(email, newPassword) {
    try {
        // Validate inputs
        if (!email) {
            console.error('❌ Please provide an email address');
            console.log('Usage: node scripts/reset-user-password.mjs <email> <newPassword>');
            process.exit(1);
        }

        if (!newPassword) {
            console.error('❌ Please provide a new password');
            console.log('Usage: node scripts/reset-user-password.mjs <email> <newPassword>');
            process.exit(1);
        }

        if (newPassword.length < 8) {
            console.error('❌ Password must be at least 8 characters');
            process.exit(1);
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
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

        // Hash the new password
        console.log('🔐 Hashing new password...');
        const hashedPassword = await hashPassword(newPassword);

        // Update the user's password
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
            select: {
                id: true,
                email: true,
                role: true,
                updatedAt: true
            }
        });

        console.log(`✅ Successfully reset password for ${updatedUser.email}`);
        console.log(`   Updated: ${updatedUser.updatedAt.toISOString()}`);
        console.log('💡 User can now log in with the new password');

    } catch (error) {
        console.error('❌ Error resetting user password:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Get email and new password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.error('❌ Please provide both email and new password');
    console.log('Usage: node scripts/reset-user-password.mjs <email> <newPassword>');
    process.exit(1);
}

console.log(`🔄 Resetting password for user "${email}"...\n`);
resetUserPassword(email, newPassword);