#!/usr/bin/env node

/**
 * Script to list all users and their roles
 * Usage: node scripts/list-users.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    if (users.length === 0) {
      console.log("📭 No users found in the database");
      return;
    }

    console.log(`👥 Found ${users.length} user(s):\n`);

    // Group users by role
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});

    // Display users grouped by role
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`🔑 ${role} (${roleUsers.length}):`);
      roleUsers.forEach((user) => {
        console.log(`   ${user.id}. ${user.email}`);
        console.log(`      Created: ${user.createdAt.toISOString()}`);
        console.log(`      Updated: ${user.updatedAt.toISOString()}`);
        console.log("");
      });
    });

    // Summary
    console.log("[Script] Summary:");
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`   ${role}: ${roleUsers.length} user(s)`);
    });
  } catch (error) {
    console.error("[Script] Error listing users:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

console.log("[Script] Listing all users...\n");
listUsers();
