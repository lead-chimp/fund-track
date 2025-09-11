#!/bin/bash

# B2 Operations Monitor
# This script helps monitor Backblaze B2 operations in production logs

echo "🔍 Monitoring Backblaze B2 Operations"
echo "===================================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow log output (like tail -f)"
    echo "  -l, --lines N    Show last N lines (default: 50)"
    echo "  -e, --errors     Show only errors"
    echo "  -a, --auth       Show only authorization events"
    echo "  -d, --download   Show only download operations"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -f                    # Follow all B2 operations"
    echo "  $0 -e -l 100            # Show last 100 error entries"
    echo "  $0 --auth --follow      # Follow authorization events"
}

# Default values
FOLLOW=false
LINES=50
FILTER=""
LOG_PATTERN="EXTERNAL_SERVICE.*Backblaze B2"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -l|--lines)
            LINES="$2"
            shift 2
            ;;
        -e|--errors)
            FILTER="success.*false"
            shift
            ;;
        -a|--auth)
            FILTER="Authorization"
            shift
            ;;
        -d|--download)
            FILTER="Generate download URL"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if we're in a Docker environment or local development
if [ -f "/.dockerenv" ] || [ "$NODE_ENV" = "production" ]; then
    # In production/Docker, logs go to stdout/stderr
    LOG_SOURCE="docker logs fund-track-app 2>&1"
else
    # In development, check for log files or use journalctl
    if [ -f "logs/app.log" ]; then
        LOG_SOURCE="cat logs/app.log"
    else
        echo "⚠️  No log file found. Using console output monitoring."
        LOG_SOURCE="echo 'No logs available in development mode. Run the application to see live logs.'"
    fi
fi

# Build the grep pattern
GREP_PATTERN="$LOG_PATTERN"
if [ ! -z "$FILTER" ]; then
    GREP_PATTERN="$LOG_PATTERN.*$FILTER"
fi

echo "📊 Monitoring B2 operations with pattern: $GREP_PATTERN"
echo "📁 Log source: $LOG_SOURCE"
echo ""

if [ "$FOLLOW" = true ]; then
    echo "👀 Following B2 operations (Press Ctrl+C to stop)..."
    echo "=================================================="
    eval "$LOG_SOURCE" | grep --line-buffered "$GREP_PATTERN" | while read line; do
        # Extract timestamp and format output
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $line"
    done
else
    echo "📋 Last $LINES B2 operations:"
    echo "=========================="
    eval "$LOG_SOURCE" | grep "$GREP_PATTERN" | tail -n "$LINES" | while read line; do
        echo "$line"
    done
fi

echo ""
echo "💡 Tips:"
echo "   • Use -f to follow live operations"
echo "   • Use -e to focus on errors"
echo "   • Use -a to monitor authorization events"
echo "   • Check for retry patterns in the logs"