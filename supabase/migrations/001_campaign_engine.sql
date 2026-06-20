-- Campaign engine additions
-- CLI-managed migration. Apply with: supabase db push
-- (Originally applied by hand in the Supabase SQL Editor; registered as
--  already-applied via `supabase migration repair --status applied 001`.)

-- 1. Add campaign engine fields to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS contact_list_id  UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_template TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS round_robin      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS daily_send_limit INT     NOT NULL DEFAULT 0;

-- 2. Make account_id nullable in message_logs (needed for round-robin)
ALTER TABLE message_logs ALTER COLUMN account_id DROP NOT NULL;

-- 3. Unique constraint so we can safely upsert (one log per contact per campaign)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_logs_campaign_contact_key'
  ) THEN
    ALTER TABLE message_logs
      ADD CONSTRAINT message_logs_campaign_contact_key
      UNIQUE (campaign_id, contact_id);
  END IF;
END $$;

-- 4. Indexes for queue processing performance
CREATE INDEX IF NOT EXISTS idx_message_logs_status_campaign
  ON message_logs (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns (status);

-- 5. Helper function: increment campaign counters atomically
CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE campaigns
  SET sent_count = sent_count + 1
  WHERE id = p_campaign_id;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE campaigns
  SET fail_count = fail_count + 1
  WHERE id = p_campaign_id;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_reply(p_campaign_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE campaigns
  SET reply_count = reply_count + 1
  WHERE id = p_campaign_id;
$$;
