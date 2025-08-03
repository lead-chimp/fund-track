#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * Test individual components to isolate the issue
 */

const { execSync } = require("child_process");

console.log("🔍 Simple Database Connection Test");
console.log("=".repeat(40));

// Test 1: Environment variables
console.log("1. Environment Check:");
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}`);
console.log(`Working directory: ${process.cwd()}`);

// Test 2: Direct Prisma Client connection
console.log("\n2. Direct Prisma Client Test:");
try {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  prisma
    .$connect()
    .then(() => {
      console.log("✅ Direct Prisma connection successful");
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error("❌ Direct Prisma connection failed:", err.message);
    });
} catch (err) {
  console.error("❌ Failed to load Prisma:", err.message);
}

// Test 3: Prisma migrate status via execSync
console.log("\n3. Prisma migrate status via execSync:");
try {
  const output = execSync("npx prisma migrate status", {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    timeout: 30000,
  });
  console.log("✅ execSync prisma migrate status successful");
  console.log("Output:", output.trim());
} catch (error) {
  console.error("❌ execSync prisma migrate status failed:", error.message);
  if (error.stderr) {
    console.error("Stderr:", error.stderr);
  }
  if (error.stdout) {
    console.error("Stdout:", error.stdout);
  }
}

// Test 4: Prisma generate
console.log("\n4. Prisma generate test:");
try {
  const output = execSync("npx prisma generate", {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    timeout: 30000,
  });
  console.log("✅ Prisma generate successful");
} catch (error) {
  console.error("❌ Prisma generate failed:", error.message);
}

console.log("\nTest complete!");
