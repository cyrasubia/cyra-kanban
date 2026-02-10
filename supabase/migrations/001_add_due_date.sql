-- ================================================
-- MIGRATION: Add due_date to existing tasks table
-- Run this in Supabase SQL Editor if the table already exists
-- ================================================

-- Add due_date column if it doesn't exist
alter table public.tasks 
  add column if not exists due_date date;

-- Add index for due_date queries
create index if not exists tasks_due_date_idx on public.tasks(user_id, due_date);

-- Verify the column was added
select column_name, data_type 
from information_schema.columns 
where table_name = 'tasks' and table_schema = 'public';
