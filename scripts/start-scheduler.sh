#!/bin/bash

# Script to manually start the background job scheduler via API
# This works in development/production with ENABLE_DEV_ENDPOINTS=true

echo "🚀 Starting background job scheduler..."

# Check if server is running
if ! curl -s "http://localhost:3000/api/dev/scheduler-status" > /dev/null; then
    echo "❌ Server is not running on localhost:3000"
    echo "Please start the server with: npm run dev"
    exit 1
fi

# Check current status first
echo "📊 Checking current scheduler status..."
status_response=$(curl -s "http://localhost:3000/api/dev/scheduler-status")
echo "$status_response" | jq '.'

# Extract isRunning status
is_running=$(echo "$status_response" | jq -r '.result.scheduler.isRunning // false')

if [ "$is_running" = "true" ]; then
    echo "✅ Scheduler is already running!"
    echo "🧪 Testing manual lead polling..."
    
    # Test manual polling
    poll_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
      -H "Content-Type: application/json" \
      -d '{"action": "poll"}')
    
    echo "Poll response: $poll_response"
else
    echo "🔧 Starting scheduler..."
    
    # Start the scheduler
    start_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
      -H "Content-Type: application/json" \
      -d '{"action": "start"}')
    
    echo "Start response: $start_response"
    
    echo ""
    echo "📊 Checking status after start..."
    curl -s "http://localhost:3000/api/dev/scheduler-status" | jq '.'
    
    echo ""
    echo "🧪 Testing manual lead polling..."
    
    # Test manual polling
    poll_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
      -H "Content-Type: application/json" \
      -d '{"action": "poll"}')
    
    echo "Poll response: $poll_response"
fi