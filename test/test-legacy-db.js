#!/usr/bin/env node

// Quick test script for legacy database connection
// Run with: node test/test-legacy-db.js

const sql = require("mssql");

const config = {
  server: process.env.LEGACY_DB_SERVER || "172.16.0.70",
  database: process.env.LEGACY_DB_DATABASE || "LeadData2",
  user: process.env.LEGACY_DB_USER || "web",
  password: process.env.LEGACY_DB_PASSWORD || "dba3311",
  port: parseInt(process.env.LEGACY_DB_PORT || "1433"),
  options: {
    encrypt: process.env.LEGACY_DB_ENCRYPT === "true",
    trustServerCertificate: process.env.LEGACY_DB_TRUST_CERT === "true",
    requestTimeout: 30000,
    connectionTimeout: 15000,
    enableArithAbort: true,
    abortTransactionOnError: true,
  },
};

console.log("[DB Test] Testing legacy database connection with config:");
console.log(
  "[DB Test]",
  JSON.stringify(
    {
      ...config,
      password: "***hidden***",
    },
    null,
    2,
  ),
);

async function testConnection() {
  let pool;
  try {
    console.log("[DB Test] Attempting to connect...");
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log("[DB Test] Connection successful!");

    console.log("[DB Test] Testing query...");
    const result = await pool
      .request()
      .query("SELECT 1 as test, GETDATE() as current_time");
    console.log("[DB Test] Query successful:", result.recordset[0]);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Error code:", error.code);
    if (error.originalError) {
      console.error("Original error:", error.originalError.message);
    }
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log("[DB Test] Connection closed");
      } catch (closeError) {
        console.error("Error closing connection:", closeError.message);
      }
    }
  }
}

testConnection();
