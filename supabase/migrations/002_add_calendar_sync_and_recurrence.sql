-- ================================================-- MIGRATION: Add Google Calendar Sync and Recurrence fields-- Run this in Supabase SQL Editor-- ================================================-- Add Google Calendar sync fields to tasks table
alter table public.tasks
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_sync_status text check (google_calendar_sync_status in ('synced', 'pending', 'error')),
  add column if not exists google_calendar_synced_at timestamptz,
  add column if not exists google_calendar_error text;

-- Add recurrence fields to tasks table
alter table public.tasks
  add column if not exists recurrence_rule text,  -- RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO")
  add column if not exists recurrence_pattern text check (recurrence_pattern in ('daily', 'weekly', 'monthly', 'yearly')),
  add column if not exists recurrence_end_date date,
  add column if not exists recurrence_count integer,
  add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade;

-- Create user_settings table for Google Calendar integration
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_calendar_enabled boolean DEFAULT false,
  google_calendar_id text,
  google_calendar_sync_enabled boolean DEFAULT false,
  google_refresh_token text,
  google_access_token text,
  google_token_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_google_calendar_event_id ON public.tasks(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Updated_at trigger for user_settings
CREATE TRIGGER set_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public'
ORDER BY ordinal_position;