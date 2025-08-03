#!/bin/bash

# Deployment validation script
# Run this before deploying to ensure everything is configured correctly

echo "🔍 Fund Track Deployment Validation"
echo "===================================="

# Check for required files
echo "\n📁 Checking required files..."

files_to_check=(
    "package.json"
    "prisma/schema.prisma"
    "scripts/debug-migrations.sh"
    "scripts/railpack-build.sh"
    "dokploy.config.js"
    "railpack.toml"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

# Check for migration files
echo "\n📁 Checking migration files..."
if [ -d "prisma/migrations" ]; then
    migration_count=$(find prisma/migrations -name "*.sql" | wc -l)
    echo "✅ Migration directory exists with $migration_count migration files"
    
    echo "\n📄 Migration files:"
    find prisma/migrations -name "*.sql" -exec basename {} \; | sort
else
    echo "❌ No migration directory found"
fi

# Check script permissions
echo "\n🔧 Checking script permissions..."
scripts=(
    "scripts/debug-migrations.sh"
    "scripts/migrate-production.js"
    "scripts/railpack-build.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "✅ $script (executable)"
        else
            echo "⚠️ $script (not executable - fixing...)"
            chmod +x "$script"
            echo "✅ $script (fixed)"
        fi
    else
        echo "❌ $script (missing)"
    fi
done

# Check package.json build script
echo "\n🔧 Checking package.json build configuration..."
if grep -q "npx prisma generate" package.json; then
    echo "✅ Build script includes Prisma generation"
else
    echo "❌ Build script missing Prisma generation"
fi

# Check railpack configuration
echo "\n📦 Checking Railpack configuration..."
railpack_found=false

if [ -f "railpack.toml" ]; then
    echo "✅ railpack.toml found"
    railpack_found=true
    if grep -q "prisma generate" railpack.toml; then
        echo "✅ Railpack TOML includes Prisma generation"
    else
        echo "❌ Railpack TOML missing Prisma generation"
    fi
    
    if grep -q "PRISMA_CLI_BINARY_TARGETS" railpack.toml; then
        echo "✅ Railpack TOML sets binary targets"
    else
        echo "❌ Railpack TOML missing binary targets"
    fi
fi

if [ -f "railpack.json" ]; then
    echo "✅ railpack.json found"
    railpack_found=true
    if grep -q "prisma generate" railpack.json; then
        echo "✅ Railpack JSON includes Prisma generation"
    else
        echo "❌ Railpack JSON missing Prisma generation"
    fi
    
    if grep -q "PRISMA_CLI_BINARY_TARGETS" railpack.json; then
        echo "✅ Railpack JSON sets binary targets"
    else
        echo "❌ Railpack JSON missing binary targets"
    fi
fi

if [ -f "nixpacks.toml" ]; then
    echo "⚠️ nixpacks.toml found (should be railpack.toml for Dokploy)"
fi

if [ "$railpack_found" = false ]; then
    echo "❌ No Railpack configuration found (railpack.toml or railpack.json)"
fi

echo "\n🎯 Validation complete!"
echo "\n💡 Next steps:"
echo "1. Fix any issues marked with ❌"
echo "2. Commit and push your changes"
echo "3. Deploy using Dokploy"
echo "4. If migrations fail, use: dokploy exec your-app-name -- /app/scripts/debug-migrations.sh"
