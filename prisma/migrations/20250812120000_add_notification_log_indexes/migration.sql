-- Add index to speed ORDER BY created_at DESC, id DESC for cursor pagination
-- NOTE: Run this migration using `prisma migrate deploy` or `psql`.
CREATE INDEX idx_notification_log_created_at_id ON notification_log(created_at DESC, id DESC);

-- Optional: a GIN full-text index for improved search across multiple text columns.
-- This index is commented out; enable if you also implement full-text queries.
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_fulltext
-- ON notification_log USING GIN (
--   to_tsvector('english', coalesce(recipient,'') || ' ' || coalesce(subject,'') || ' ' || coalesce(content,'') || ' ' || coalesce(external_id,'') || ' ' || coalesce(error_message,''))
-- );
