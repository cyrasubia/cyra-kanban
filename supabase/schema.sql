-- ================================================
-- Cyra Command Center Database Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================
-- PROFILES TABLE (extends auth.users)
-- ================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ================================================
-- TASKS TABLE
-- ================================================
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  column_id text not null default 'inbox',
  priority text check (priority in ('low', 'medium', 'high')),
  project text,
  position integer not null default 0,
  due_date date,
  created_by text check (created_by in ('victor', 'cyra')) default 'victor',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ================================================
-- NOTES TABLE
-- ================================================
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  from_user text check (from_user in ('victor', 'cyra')) default 'victor',
  read boolean default false,
  created_at timestamptz default now() not null
);

-- ================================================
-- LOGS TABLE
-- ================================================
create table if not exists public.logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  details text,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz default now() not null
);

-- ================================================
-- STATUS TABLE
-- ================================================
create table if not exists public.status (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  state text check (state in ('idle', 'working', 'thinking')) default 'idle',
  current_task text,
  updated_at timestamptz default now() not null
);

-- ================================================
-- CONTEXT TABLE (business context)
-- ================================================
create table if not exists public.context (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  goals text[] default '{}',
  initiatives text[] default '{}',
  updated_at timestamptz default now() not null
);

-- ================================================
-- PROJECTS TABLE
-- ================================================
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  client text,
  status text check (status in ('active', 'paused', 'completed')) default 'active',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.logs enable row level security;
alter table public.status enable row level security;
alter table public.context enable row level security;
alter table public.projects enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Tasks policies
create policy "Users can view their own tasks"
  on public.tasks for select using (auth.uid() = user_id);

create policy "Users can create tasks"
  on public.tasks for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

-- Notes policies
create policy "Users can view their own notes"
  on public.notes for select using (auth.uid() = user_id);

create policy "Users can create notes"
  on public.notes for insert with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes for update using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes for delete using (auth.uid() = user_id);

-- Logs policies
create policy "Users can view their own logs"
  on public.logs for select using (auth.uid() = user_id);

create policy "Users can create logs"
  on public.logs for insert with check (auth.uid() = user_id);

-- Status policies
create policy "Users can view their own status"
  on public.status for select using (auth.uid() = user_id);

create policy "Users can manage their own status"
  on public.status for all using (auth.uid() = user_id);

-- Context policies
create policy "Users can view their own context"
  on public.context for select using (auth.uid() = user_id);

create policy "Users can manage their own context"
  on public.context for all using (auth.uid() = user_id);

-- Projects policies
create policy "Users can view their own projects"
  on public.projects for select using (auth.uid() = user_id);

create policy "Users can manage their own projects"
  on public.projects for all using (auth.uid() = user_id);

-- ================================================
-- TRIGGERS
-- ================================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default status
  insert into public.status (user_id) values (new.id);
  
  -- Create default context
  insert into public.context (user_id) values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.status
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.context
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- ================================================
-- INDEXES
-- ================================================
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_column_idx on public.tasks(user_id, column_id);
create index if not exists tasks_position_idx on public.tasks(column_id, position);
create index if not exists tasks_due_date_idx on public.tasks(user_id, due_date);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_unread_idx on public.notes(user_id, read) where read = false;
create index if not exists logs_user_id_idx on public.logs(user_id);
create index if not exists logs_created_idx on public.logs(user_id, created_at desc);
create index if not exists projects_user_id_idx on public.projects(user_id);
