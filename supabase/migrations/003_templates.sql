-- Templates table
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Other'
                 CHECK (category IN ('Prospecting','Follow-up','Sales','Event','Other')),
  message_body TEXT NOT NULL,
  used_count   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "templates_insert" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_update" ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "templates_delete" ON templates FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);

-- Unique constraint on contacts to support CSV upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_list_phone_unique'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_list_phone_unique
      UNIQUE (list_id, phone_number);
  END IF;
END $$;
