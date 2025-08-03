#!/usr/bin/env node

/**
 * Test version of Dokploy migration script with DATABASE_URL set
 * This is for local testing only - the actual dokploy-migrate.js relies on Dokploy's environment
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Set the DATABASE_URL for testing
process.env.DATABASE_URL =
  "postgresql://postgres:K8mX9vN2wer5Bgh5uE3yT6zA1B4fGty67Nhju@merchant-funding-fundtrackdb-ghvfoz:5432/fund_track_app";

// Set NODE_ENV for production-like behavior
process.env.NODE_ENV = "production";

// Import the actual migration logic
require("./dokploy-migrate.js");
