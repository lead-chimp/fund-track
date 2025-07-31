#!/bin/bash

# Health Check Script for Production Monitoring
# This script can be used by monitoring systems to check application health

set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5}"
RETRY_COUNT="${HEALTH_CHECK_RETRIES:-3}"
RETRY_DELAY="${HEALTH_CHECK_RETRY_DELAY:-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Health check function
check_health() {
    local attempt=1
    
    while [ $attempt -le $RETRY_COUNT ]; do
        log "Health check attempt $attempt/$RETRY_COUNT..."
        
        # Make HTTP request with timeout
        if response=$(curl -s -f --max-time $TIMEOUT "$HEALTH_URL" 2>/dev/null); then
            # Parse JSON response
            status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            case "$status" in
                "healthy")
                    echo -e "${GREEN}✅ Application is healthy${NC}"
                    echo "$response" | jq '.' 2>/dev/null || echo "$response"
                    return 0
                    ;;
                "degraded")
                    echo -e "${YELLOW}⚠️  Application is degraded${NC}"
                    echo "$response" | jq '.' 2>/dev/null || echo "$response"
                    return 1
                    ;;
                "unhealthy")
                    echo -e "${RED}❌ Application is unhealthy${NC}"
                    echo "$response" | jq '.' 2>/dev/null || echo "$response"
                    return 2
                    ;;
                *)
                    echo -e "${RED}❓ Unknown health status: $status${NC}"
                    return 3
                    ;;
            esac
        else
            echo -e "${RED}❌ Health check failed (attempt $attempt/$RETRY_COUNT)${NC}"
            
            if [ $attempt -lt $RETRY_COUNT ]; then
                log "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}💥 All health check attempts failed${NC}"
    return 4
}

# Main execution
main() {
    log "🏥 Starting health check for $HEALTH_URL"
    
    if check_health; then
        log "🎉 Health check passed"
        exit 0
    else
        exit_code=$?
        log "💥 Health check failed with exit code $exit_code"
        exit $exit_code
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --verbose, -v  Enable verbose output"
        echo ""
        echo "Environment Variables:"
        echo "  HEALTH_URL                Health check endpoint URL (default: http://localhost:3000/api/health)"
        echo "  HEALTH_CHECK_TIMEOUT      Request timeout in seconds (default: 5)"
        echo "  HEALTH_CHECK_RETRIES      Number of retry attempts (default: 3)"
        echo "  HEALTH_CHECK_RETRY_DELAY  Delay between retries in seconds (default: 2)"
        echo ""
        echo "Exit Codes:"
        echo "  0  Healthy"
        echo "  1  Degraded"
        echo "  2  Unhealthy"
        echo "  3  Unknown status"
        echo "  4  Connection failed"
        exit 0
        ;;
    --verbose|-v)
        set -x
        main
        ;;
    *)
        main
        ;;
esac