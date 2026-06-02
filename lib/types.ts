export type AccountType = "baileys" | "business_api";
export type AccountStatus = "connected" | "warming" | "disconnected";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type SequenceStatus = "active" | "paused";
export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "replied"
  | "failed";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  type: AccountType;
  status: AccountStatus;
  daily_limit: number;
  messages_sent_today: number;
  health_score: number;
  session_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: CampaignStatus;
  account_id: string;
  total_contacts: number;
  sent_count: number;
  open_count: number;
  reply_count: number;
  fail_count: number;
  started_at: string | null;
  created_at: string;
}

export interface Sequence {
  id: string;
  user_id: string;
  name: string;
  campaign_id: string;
  status: SequenceStatus;
  stop_on_reply: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  created_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  label: string;
  message_template: string;
  delay_hours: number;
  created_at: string;
}

export interface ContactList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  list_id: string;
  name: string;
  phone_number: string;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface MessageLog {
  id: string;
  campaign_id: string;
  contact_id: string;
  account_id: string;
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  error_message: string | null;
}

// Supabase Database type for typed client
export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: Omit<Account, "id" | "created_at">;
        Update: Partial<Omit<Account, "id" | "created_at">>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, "id" | "created_at">;
        Update: Partial<Omit<Campaign, "id" | "created_at">>;
      };
      sequences: {
        Row: Sequence;
        Insert: Omit<Sequence, "id" | "created_at">;
        Update: Partial<Omit<Sequence, "id" | "created_at">>;
      };
      sequence_steps: {
        Row: SequenceStep;
        Insert: Omit<SequenceStep, "id" | "created_at">;
        Update: Partial<Omit<SequenceStep, "id" | "created_at">>;
      };
      contact_lists: {
        Row: ContactList;
        Insert: Omit<ContactList, "id" | "created_at">;
        Update: Partial<Omit<ContactList, "id" | "created_at">>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at">;
        Update: Partial<Omit<Contact, "id" | "created_at">>;
      };
      message_logs: {
        Row: MessageLog;
        Insert: Omit<MessageLog, "id">;
        Update: Partial<Omit<MessageLog, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      account_status: AccountStatus;
      campaign_status: CampaignStatus;
      sequence_status: SequenceStatus;
      message_status: MessageStatus;
    };
  };
};
