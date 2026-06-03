-- Sequence engine additions
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Extend sequences table with account targeting
ALTER TABLE sequences
  ADD COLUMN IF NOT EXISTS account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_robin  BOOLEAN NOT NULL DEFAULT FALSE;

-- Make campaign_id nullable (sequences can exist independently of campaigns)
ALTER TABLE sequences ALTER COLUMN campaign_id DROP NOT NULL;

-- 2. Extend message_logs to track sequence step origin
ALTER TABLE message_logs ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS sequence_id   UUID REFERENCES sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_step INT;

CREATE INDEX IF NOT EXISTS idx_message_logs_sequence
  ON message_logs(sequence_id, sequence_step);

-- 3. Create sequence_enrollments table
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id   UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id)  ON DELETE CASCADE,
  current_step  INT  NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','stopped','replied')),
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  last_sent_at  TIMESTAMPTZ,
  next_send_at  TIMESTAMPTZ,
  UNIQUE(sequence_id, contact_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seq_enroll_select" ON sequence_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "seq_enroll_insert" ON sequence_enrollments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "seq_enroll_update" ON sequence_enrollments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "seq_enroll_delete" ON sequence_enrollments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
  ));

-- 4. Indexes for fast tick processing
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_due
  ON sequence_enrollments(sequence_id, next_send_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_contact
  ON sequence_enrollments(contact_id, status);
