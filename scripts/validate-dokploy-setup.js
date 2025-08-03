#!/usr/bin/env node

/**
 * Dokploy Migration Setup Validation Script
 * Validates that the migration automation is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Dokploy Migration Setup...\n');

let validationPassed = true;
const issues = [];
const warnings = [];

// Check required files
const requiredFiles = [
  'scripts/dokploy-migrate.js',
  'railpack.toml',
  'dokploy.config.js',
  'package.json',
  'prisma/schema.prisma'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    issues.push(`Missing required file: ${file}`);
    validationPassed = false;
  }
});

// Check for conflicting files
const conflictingFiles = ['railpack.json'];
console.log('\n🚫 Checking for conflicting files...');
conflictingFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} - SHOULD BE REMOVED`);
    warnings.push(`Conflicting file exists: ${file} (should be removed to avoid configuration conflicts)`);
  } else {
    console.log(`  ✅ ${file} - Correctly removed`);
  }
});

// Check railpack.toml configuration
console.log('\n⚙️  Checking railpack.toml configuration...');
if (fs.existsSync('railpack.toml')) {
  const railpackContent = fs.readFileSync('railpack.toml', 'utf8');
  
  if (railpackContent.includes('node scripts/dokploy-migrate.js && npm start')) {
    console.log('  ✅ Start command includes migration script');
  } else {
    console.log('  ❌ Start command missing migration script');
    issues.push('railpack.toml start command does not include migration script');
    validationPassed = false;
  }
  
  if (railpackContent.includes('DATABASE_URL')) {
    console.log('  ✅ DATABASE_URL variable configured');
  } else {
    console.log('  ❌ DATABASE_URL variable missing');
    issues.push('railpack.toml missing DATABASE_URL variable');
    validationPassed = false;
  }
  
  if (railpackContent.includes('NODE_ENV')) {
    console.log('  ✅ NODE_ENV variable configured');
  } else {
    console.log('  ⚠️  NODE_ENV variable missing');
    warnings.push('Consider adding NODE_ENV variable to railpack.toml');
  }
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts['db:migrate:dokploy']) {
    console.log('  ✅ db:migrate:dokploy script exists');
  } else {
    console.log('  ⚠️  db:migrate:dokploy script missing');
    warnings.push('Consider adding db:migrate:dokploy script for manual testing');
  }
}

// Check dokploy.config.js
console.log('\n🐳 Checking dokploy.config.js...');
if (fs.existsSync('dokploy.config.js')) {
  const dokployConfig = fs.readFileSync('dokploy.config.js', 'utf8');
  
  if (dokployConfig.includes('postDeploy')) {
    console.log('  ⚠️  PostDeploy hook found - may conflict with railpack start command');
    warnings.push('dokploy.config.js contains postDeploy hook which may conflict with railpack.toml start command');
  } else {
    console.log('  ✅ No conflicting postDeploy hooks');
  }
}

// Check migration files
console.log('\n🗃️  Checking migration files...');
const migrationsDir = 'prisma/migrations';
if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir).filter(dir => 
    fs.statSync(path.join(migrationsDir, dir)).isDirectory()
  );
  
  if (migrations.length > 0) {
    console.log(`  ✅ Found ${migrations.length} migration(s):`);
    migrations.forEach(migration => {
      console.log(`    - ${migration}`);
    });
  } else {
    console.log('  ⚠️  No migrations found');
    warnings.push('No migration files found in prisma/migrations');
  }
} else {
  console.log('  ❌ Migrations directory missing');
  issues.push('prisma/migrations directory does not exist');
  validationPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (validationPassed && issues.length === 0) {
  console.log('🎉 VALIDATION PASSED');
  console.log('✅ Migration automation is properly configured');
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }
  
  console.log('\n📋 Next Steps:');
  console.log('  1. Commit and push your changes');
  console.log('  2. Deploy via Dokploy');
  console.log('  3. Monitor deployment logs for migration execution');
  console.log('  4. Verify application starts successfully');
  
} else {
  console.log('❌ VALIDATION FAILED');
  console.log('\n🚨 Issues that must be fixed:');
  issues.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue}`);
  });
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Additional warnings:');
    warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }
  
  console.log('\n📋 Fix the issues above and run this script again.');
}

console.log('\n📖 For detailed troubleshooting, see:');
console.log('  - docs/DOKPLOY_MIGRATIONS.md');
console.log('  - docs/DOKPLOY_MIGRATION_TROUBLESHOOTING.md');
console.log('='.repeat(60));

process.exit(validationPassed ? 0 : 1);
