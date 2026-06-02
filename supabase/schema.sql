-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE account_type AS ENUM ('baileys', 'business_api');
CREATE TYPE account_status AS ENUM ('connected', 'warming', 'disconnected');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE sequence_status AS ENUM ('active', 'paused');
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'opened', 'replied', 'failed');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone_number  TEXT NOT NULL,
  type          account_type NOT NULL DEFAULT 'baileys',
  status        account_status NOT NULL DEFAULT 'disconnected',
  daily_limit   INT NOT NULL DEFAULT 200,
  messages_sent_today INT NOT NULL DEFAULT 0,
  health_score  INT NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  session_data  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          campaign_status NOT NULL DEFAULT 'draft',
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  total_contacts  INT NOT NULL DEFAULT 0,
  sent_count      INT NOT NULL DEFAULT 0,
  open_count      INT NOT NULL DEFAULT 0,
  reply_count     INT NOT NULL DEFAULT 0,
  fail_count      INT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sequences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status              sequence_status NOT NULL DEFAULT 'active',
  stop_on_reply       BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start   INT NOT NULL DEFAULT 8 CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end     INT NOT NULL DEFAULT 22 CHECK (quiet_hours_end BETWEEN 0 AND 23),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sequence_steps (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id       UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number       INT NOT NULL,
  label             TEXT NOT NULL,
  message_template  TEXT NOT NULL,
  delay_hours       INT NOT NULL DEFAULT 24,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sequence_id, step_number)
);

CREATE TABLE contact_lists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id       UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone_number  TEXT NOT NULL,
  custom_fields JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  status          message_status NOT NULL DEFAULT 'queued',
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  error_message   TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_sequences_user_id ON sequences(user_id);
CREATE INDEX idx_sequences_campaign_id ON sequences(campaign_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_list_id ON contacts(list_id);
CREATE INDEX idx_message_logs_campaign_id ON message_logs(campaign_id);
CREATE INDEX idx_message_logs_contact_id ON message_logs(contact_id);
CREATE INDEX idx_message_logs_status ON message_logs(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs    ENABLE ROW LEVEL SECURITY;

-- accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- campaigns
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- sequences
CREATE POLICY "sequences_select" ON sequences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sequences_insert" ON sequences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sequences_update" ON sequences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sequences_delete" ON sequences FOR DELETE USING (auth.uid() = user_id);

-- sequence_steps (scoped via join to sequences.user_id)
CREATE POLICY "sequence_steps_select" ON sequence_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()));
CREATE POLICY "sequence_steps_insert" ON sequence_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()));
CREATE POLICY "sequence_steps_update" ON sequence_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()));
CREATE POLICY "sequence_steps_delete" ON sequence_steps FOR DELETE
  USING (EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()));

-- contact_lists
CREATE POLICY "contact_lists_select" ON contact_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contact_lists_insert" ON contact_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contact_lists_update" ON contact_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "contact_lists_delete" ON contact_lists FOR DELETE USING (auth.uid() = user_id);

-- contacts
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- message_logs (scoped via join to campaigns.user_id)
CREATE POLICY "message_logs_select" ON message_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "message_logs_insert" ON message_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "message_logs_update" ON message_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
