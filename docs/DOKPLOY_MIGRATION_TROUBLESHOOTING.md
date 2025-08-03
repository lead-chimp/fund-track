# Dokploy Migration Troubleshooting Guide

## Issue: Migrations didn't run automatically but worked manually

### Root Cause Analysis

The manual command `npm run db:migrate:dokploy` worked, which means:
- ✅ Database is accessible
- ✅ Migration script logic is correct
- ✅ Environment variables are properly set
- ❌ **The issue is with the automatic execution during deployment**

### Potential Causes

1. **Configuration File Priority**
   - Both `railpack.toml` and `railpack.json` exist
   - Dokploy might be using the wrong file or an older version

2. **Deployment Phase Timing**
   - Migration script might be running too early (before database is ready)
   - Migration script might not be running at all due to configuration issues

3. **Environment Context**
   - Different environment variables during deployment vs manual execution
   - Different working directory or execution context

## Debugging Steps

### 1. Check Deployment Logs

Look for these indicators in Dokploy deployment logs:

**Expected Success Pattern:**
```
🚀 Starting Dokploy postDeploy migration process
🔍 Environment Information:
✅ Database connectivity check successful
🔧 Generating Prisma client...
🚀 Deploying database migrations...
🎉 Dokploy postDeploy migration completed successfully!
```

**If Missing Entirely:**
- The start command is not being executed
- Check Railpack configuration file priority

**If Failing at Database Check:**
- Database not ready during deployment
- Connection string issues

### 2. Verify Railpack Configuration

Ensure both configuration files have the migration command:

```bash
# Check both files have the correct start command
grep -A 2 "phases.start" railpack.toml
grep -A 3 '"start"' railpack.json
```

**Expected Output:**
```toml
[phases.start]
cmd = "node scripts/dokploy-migrate.js && npm start"
```

```json
"start": {
  "cmd": "node scripts/dokploy-migrate.js && npm start"
}
```

### 3. Check Dokploy Application Settings

In Dokploy dashboard:
- **Build Type**: Should be "Railpack"
- **Configuration File**: Should point to `railpack.toml` (preferred) or `railpack.json`
- **Auto-deploy**: Should be enabled
- **Build Context**: Should be `/` (root)

### 4. Environment Variables Verification

Ensure these are set in Dokploy:
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: "production"
- `SKIP_ENV_VALIDATION`: "true"

### 5. Manual Verification Commands

Run these in your local environment to verify the setup:

```bash
# Test the exact command that should run during deployment
DATABASE_URL='your_database_url' node scripts/dokploy-migrate.js

# Check if railpack files are valid
# (This would need to be done in Dokploy environment)
```

## Solutions

### Solution 1: Force Single Configuration File

Remove one of the Railpack configuration files to avoid conflicts:

```bash
# Keep railpack.toml (recommended)
rm railpack.json

# OR keep railpack.json
rm railpack.toml
```

### Solution 2: Add Deployment Debug Mode

Add debug environment variable in Dokploy:
```
DEBUG_DEPLOYMENT=true
```

Then check the enhanced logs for more details.

### Solution 3: Alternative Deployment Hook

If the start command approach continues to fail, switch to a different hook approach:

1. **Pre-start Hook** (if supported by Railpack)
2. **Custom Build Step** - Move migration to build phase
3. **Application-level Check** - Move migration check to application startup

### Solution 4: Verify Dokploy Version

Ensure you're using a compatible Dokploy version that properly supports:
- Railpack configuration files
- Start phase commands
- Environment variable passing

## Next Steps

1. **Check Deployment Logs**: Look for the migration script output
2. **Verify Configuration**: Ensure Dokploy is using the correct Railpack file
3. **Test Single Config**: Remove either `railpack.json` or `railpack.toml`
4. **Monitor Next Deployment**: Watch logs during deployment for migration execution

## Success Indicators

After implementing fixes, you should see:
- ✅ Migration script output in deployment logs
- ✅ Database migrations applied automatically
- ✅ Application starts successfully
- ✅ No manual intervention required

## Fallback Plan

If automatic migrations continue to fail:
1. Remove migration from start command
2. Create a separate deployment step or manual process
3. Use Dokploy's custom deployment hooks (if available)
4. Implement application-level migration checks

---

**Last Updated**: Based on debugging session where manual migrations worked
