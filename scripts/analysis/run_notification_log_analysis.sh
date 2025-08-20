#!/usr/bin/env bash
set -euo pipefail

# Run a set of read-only diagnostic queries against the PRODUCTION database.
# Usage:
#   DATABASE_URL="postgres://..." ./scripts/analysis/run_notification_log_analysis.sh [--include-heavy]
#
# By default heavy queries (COUNT(*)) are skipped. Pass --include-heavy to run them.

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL must be set to your production database connection string"
  exit 1
fi

INCLUDE_HEAVY=0
if [ "${1:-}" = "--include-heavy" ]; then
  INCLUDE_HEAVY=1
fi

OUTFILE="notification_log_report_$(date +%Y%m%d_%H%M%S).txt"
echo "Writing report to $OUTFILE"

run_query() {
  local sql="$1"
  echo "---" >> "$OUTFILE"
  echo "Query: $2" >> "$OUTFILE"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -c "$sql" >> "$OUTFILE"
}

echo "Notification log analysis report" > "$OUTFILE"
echo "Generated: $(date -u)" >> "$OUTFILE"
echo >> "$OUTFILE"

if [ "$INCLUDE_HEAVY" -eq 1 ]; then
  echo "Running heavy queries (COUNT)" >> "$OUTFILE"
  run_query "SELECT 'total_rows' as metric, count(*)::bigint as value FROM notification_log;" "Total rows"
else
  echo "Skipping heavy COUNT(*) queries. Pass --include-heavy to enable." >> "$OUTFILE"
fi

run_query "SELECT status, count(*) as cnt FROM notification_log GROUP BY status ORDER BY cnt DESC;" "Rows by status"

run_query "SELECT date(created_at) AS day, count(*) AS cnt FROM notification_log WHERE created_at >= now() - interval '30 days' GROUP BY day ORDER BY day DESC;" "Rows per day (30d)"

run_query "SELECT recipient, count(*) as cnt FROM notification_log GROUP BY recipient ORDER BY cnt DESC LIMIT 50;" "Top recipients"

run_query "SELECT lead_id, count(*) as cnt FROM notification_log WHERE lead_id IS NOT NULL GROUP BY lead_id ORDER BY cnt DESC LIMIT 50;" "Top lead IDs by count"

run_query "SELECT external_id, count(*) as cnt FROM notification_log WHERE external_id IS NOT NULL GROUP BY external_id HAVING count(*) > 1 ORDER BY cnt DESC LIMIT 50;" "Duplicate external IDs"

run_query "SELECT pg_relation_size('notification_log') AS table_bytes, pg_total_relation_size('notification_log') AS total_bytes, pg_total_relation_size('notification_log') - pg_relation_size('notification_log') AS toast_index_bytes;" "Table and index sizes"

if [ "$INCLUDE_HEAVY" -eq 1 ]; then
  run_query "SELECT (pg_total_relation_size('notification_log')::numeric / NULLIF((SELECT count(*) FROM notification_log),0))::numeric(12,2) AS avg_bytes_per_row;" "Avg bytes per row"
fi

run_query "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notification_log';" "Indexes on notification_log"

run_query "SELECT id, lead_id, recipient, subject, status, external_id, error_message, created_at FROM notification_log ORDER BY created_at DESC LIMIT 20;" "Sample recent rows"

echo "Report complete: $OUTFILE"


