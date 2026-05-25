-- ============================================================================
-- 004_dashboard_analytics_indexes.sql
-- ----------------------------------------------------------------------------
-- Supports the AgentDashboard analytics endpoint:
--   GET /api/agent/customers/analytics
--
-- All six underlying queries filter on agent_id FIRST and then on a date
-- column. These composite indexes let MySQL satisfy each predicate with an
-- index range scan rather than a per-agent table scan.
--
-- HOW TO RUN (manual, by DBA):
--   1. Review against `SHOW INDEX FROM agent_customers;` — skip any that
--      already exist with the same column order. MySQL does not have
--      CREATE INDEX IF NOT EXISTS prior to 8.0.29 in a portable way.
--   2. Apply during a low-traffic window. Each CREATE INDEX is an online
--      ALTER under InnoDB (no full table rewrite) but holds metadata locks
--      briefly.
--   3. Expected disk impact: small. Each composite index on agent_customers
--      is roughly (rows * 16 bytes) at this schema.
--
-- SAFE TO RE-RUN: lines are commented out by default. Uncomment only what
-- isn't already present.
-- ============================================================================

-- (assigned_at) scan used by: customersCreated, getDashboardStatusCounts.
-- CREATE INDEX idx_ac_agent_assigned   ON agent_customers (agent_id, assigned_at);

-- (updated_at) scan used by: customersUpdated, topCustomers ORDER BY updated_at DESC.
-- CREATE INDEX idx_ac_agent_updated    ON agent_customers (agent_id, updated_at);

-- (follow_up_date) scan used by: followupTimeline (CURDATE compares),
-- followupStatusDistribution (range), topFollowups (range + ORDER BY).
-- CREATE INDEX idx_ac_agent_followup   ON agent_customers (agent_id, follow_up_date);

-- (done_date) scan used by: summaryStatusDistribution (the visit-done/booking-done branch).
-- CREATE INDEX idx_ac_agent_done       ON agent_customers (agent_id, done_date);

-- (is_active, status_code) helps the summary + followup status GROUP BYs
-- when combined with the date indexes above via index merge.
-- CREATE INDEX idx_ac_agent_active_status
--   ON agent_customers (agent_id, is_active, status_code);
