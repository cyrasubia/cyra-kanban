-- Add new clients for Victor
-- Run this in Supabase SQL Editor

-- Insert new clients (Spirit Threads and Mindvibe already exist)
INSERT INTO clients (id, user_id, name, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), '14c09ffa-2671-4e78-8220-4dde396fdf52', 'Megan May', 'active', NOW(), NOW()),
  (gen_random_uuid(), '14c09ffa-2671-4e78-8220-4dde396fdf52', 'Phoinix Supplements', 'active', NOW(), NOW()),
  (gen_random_uuid(), '14c09ffa-2671-4e78-8220-4dde396fdf52', 'Paleo Foundation', 'active', NOW(), NOW()),
  (gen_random_uuid(), '14c09ffa-2671-4e78-8220-4dde396fdf52', 'Austin Mobile Storage', 'active', NOW(), NOW()),
  (gen_random_uuid(), '14c09ffa-2671-4e78-8220-4dde396fdf52', 'TX State Hearing Aid Center', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;
