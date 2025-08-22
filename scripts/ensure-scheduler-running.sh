#!/bin/bash

# Script to ensure the background job scheduler is running
# This can be run as a cron job or startup script in production

echo "🔍 Checking scheduler status..."

# Wait for server to be ready
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
        echo "✅ Server is ready"
        break
    fi
    echo "⏳ Waiting for server to start... (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Server failed to start within expected time"
    exit 1
fi

# Check scheduler status
status_response=$(curl -s "http://localhost:3000/api/dev/scheduler-status" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to check scheduler status"
    exit 1
fi

# Extract isRunning status
is_running=$(echo "$status_response" | jq -r '.result.scheduler.isRunning // false' 2>/dev/null)

if [ "$is_running" = "true" ]; then
    echo "✅ Scheduler is already running"
    
    # Test manual polling to ensure it's working
    echo "🧪 Testing manual lead polling..."
    poll_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
      -H "Content-Type: application/json" \
      -d '{"action": "poll"}' 2>/dev/null)
    
    if echo "$poll_response" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ Manual polling test successful"
    else
        echo "⚠️  Manual polling test failed: $poll_response"
    fi
else
    echo "🔧 Starting scheduler..."
    
    # Start the scheduler
    start_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
      -H "Content-Type: application/json" \
      -d '{"action": "start"}' 2>/dev/null)
    
    if echo "$start_response" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ Scheduler started successfully"
        
        # Verify it's running
        sleep 2
        status_response=$(curl -s "http://localhost:3000/api/dev/scheduler-status" 2>/dev/null)
        is_running=$(echo "$status_response" | jq -r '.result.scheduler.isRunning // false' 2>/dev/null)
        
        if [ "$is_running" = "true" ]; then
            echo "✅ Scheduler confirmed running"
            
            # Test manual polling
            echo "🧪 Testing manual lead polling..."
            poll_response=$(curl -s -X POST "http://localhost:3000/api/dev/scheduler-status" \
              -H "Content-Type: application/json" \
              -d '{"action": "poll"}' 2>/dev/null)
            
            if echo "$poll_response" | jq -e '.success' > /dev/null 2>&1; then
                echo "✅ Manual polling test successful"
                echo "🎉 Scheduler is now running and functional!"
            else
                echo "⚠️  Manual polling test failed: $poll_response"
            fi
        else
            echo "❌ Scheduler failed to start properly"
            exit 1
        fi
    else
        echo "❌ Failed to start scheduler: $start_response"
        exit 1
    fi
fi

echo "📊 Final status:"
curl -s "http://localhost:3000/api/dev/scheduler-status" | jq '.result.scheduler'