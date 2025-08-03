#!/bin/bash

echo "🔍 Database Connectivity Diagnostic"
echo "=================================="

echo
echo "1. Environment Variables:"
echo "DATABASE_URL: $DATABASE_URL"

echo
echo "2. Network connectivity test:"
DB_HOST="merchant-funding-fundtrackdb-ghvfoz"
DB_PORT="5432"

if command -v nc >/dev/null 2>&1; then
    echo "Testing connection with netcat..."
    if nc -zv $DB_HOST $DB_PORT 2>&1; then
        echo "✅ Port $DB_PORT is open on $DB_HOST"
    else
        echo "❌ Cannot connect to $DB_HOST:$DB_PORT"
    fi
else
    echo "netcat not available, trying telnet..."
    if command -v telnet >/dev/null 2>&1; then
        timeout 5 telnet $DB_HOST $DB_PORT || echo "❌ Telnet connection failed"
    else
        echo "Neither nc nor telnet available"
    fi
fi

echo
echo "3. DNS Resolution:"
if command -v nslookup >/dev/null 2>&1; then
    nslookup $DB_HOST || echo "❌ DNS lookup failed"
elif command -v getent >/dev/null 2>&1; then
    getent hosts $DB_HOST || echo "❌ Host lookup failed"
else
    echo "No DNS tools available"
fi

echo
echo "4. PostgreSQL Client Test:"
if command -v psql >/dev/null 2>&1; then
    echo "psql is available, testing connection..."
    psql "$DATABASE_URL" -c "SELECT 1 as test;" 2>&1 || echo "❌ psql connection failed"
else
    echo "psql not available in container"
fi

echo
echo "5. Node.js/Prisma Test:"
if command -v node >/dev/null 2>&1; then
    echo "Testing with Node.js..."
    node -e "
    console.log('Node.js version:', process.version);
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        console.log('Prisma client loaded successfully');
        prisma.\$connect()
            .then(() => {
                console.log('✅ Prisma database connection successful');
                return prisma.\$disconnect();
            })
            .catch(err => {
                console.error('❌ Prisma connection failed:', err.message);
                console.error('Full error:', err);
            });
    } catch (err) {
        console.error('❌ Failed to load Prisma:', err.message);
    }
    " 2>&1
else
    echo "Node.js not available"
fi

echo
echo "Diagnostic complete."
