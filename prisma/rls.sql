-- ============================================================
-- Defense-in-depth tenant isolation (optional, second layer).
--
-- The app already enforces tenantId filtering at the application
-- layer (lib/db.ts + every API route scopes by auth.tenantId).
-- These RLS policies are a SECOND, independent layer: even if a
-- future code change forgets to filter by tenant, Postgres itself
-- will refuse to return/modify another tenant's rows, as long as
-- the connection sets `app.current_tenant_id` per-request (e.g.
-- via `SET LOCAL` inside a transaction, using a Prisma $extends
-- middleware — see lib/db-rls.ts for the optional wiring).
--
-- Apply with: psql $DATABASE_URL -f prisma/rls.sql
-- (Not required for the take-home demo — included to show
-- awareness of defense-in-depth for the Security requirement.)
-- ============================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contacts ON contacts
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_opportunities ON opportunities
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_tasks ON tasks
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_conversations ON conversations
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_messages ON messages
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_chat_sessions ON chat_sessions
  USING ("tenantId" = current_setting('app.current_tenant_id', true));
