-- Migration: Add task types and entity tables
-- Date: 2026-02-12
-- Description: Add clients, products tables and task_type, client_id, product_id fields to tasks

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, paused, completed
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients 
  FOR ALL USING (auth.uid() = user_id);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  repo_url TEXT,
  production_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage their own products" ON products 
  FOR ALL USING (auth.uid() = user_id);

-- 3. Add new fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_product_id ON tasks(product_id);

-- 4. Insert initial products (House Fly, Agent Zero, etc.)
INSERT INTO products (user_id, name, production_url, description)
VALUES 
  ('14c09ffa-2671-4e78-8220-4dde396fdf52', 'House Fly', 'https://agent-zero-olive.vercel.app/', 'AI real estate app'),
  ('14c09ffa-2671-4e78-8220-4dde396fdf52', 'Agent Zero', 'https://agent-zero-olive.vercel.app/', 'AI real estate agent app'),
  ('14c09ffa-2671-4e78-8220-4dde396fdf52', 'Cyra Command Center', 'https://cyra-kanban.vercel.app', 'Kanban board and task management')
ON CONFLICT DO NOTHING;

-- 5. Insert initial clients (Spirit Threads, Mindvibe)
INSERT INTO clients (user_id, name, status)
VALUES 
  ('14c09ffa-2671-4e78-8220-4dde396fdf52', 'Spirit Threads', 'active'),
  ('14c09ffa-2671-4e78-8220-4dde396fdf52', 'Mindvibe', 'active')
ON CONFLICT DO NOTHING;

-- 6. Update existing tasks with task_type based on title/project
UPDATE tasks SET task_type = 'client' WHERE project IN ('Spirit Threads', 'Mindvibe') OR title LIKE '%Client Project%';
UPDATE tasks SET task_type = 'feature' WHERE project = 'House Fly' OR title LIKE '%Feature%' OR title LIKE '%bug%';
UPDATE tasks SET task_type = 'event' WHERE event_date IS NOT NULL;
UPDATE tasks SET task_type = 'initiative' WHERE title LIKE '%Target Enterprises%' OR title LIKE '%Strategy%';

-- 7. Link existing client tasks to clients
UPDATE tasks t SET client_id = c.id 
FROM clients c 
WHERE t.project = c.name OR t.title LIKE '%' || c.name || '%';

-- 8. Link existing feature tasks to products
UPDATE tasks t SET product_id = p.id 
FROM products p 
WHERE t.project = p.name OR t.title LIKE '%' || p.name || '%';

COMMENT ON COLUMN tasks.task_type IS 'Type: task (default), client, feature, initiative, reminder, event';
COMMENT ON TABLE clients IS 'Client companies and contact information';
COMMENT ON TABLE products IS 'Products/apps for feature tracking';
