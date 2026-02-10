// Migration script to add due_date column
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ftqxodjocweksnrmqvpk.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cXhvZGpvY3dla3Nucm1xdnBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYzMjM4NCwiZXhwIjoyMDg1MjA4Mzg0fQ.UWBiTnvSMEmHbTJYU7HmO8NvoNSwjVAAqZGiZFs-H_M'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function migrate() {
  console.log('Applying migration: Add due_date column to tasks...')
  
  // Check if column exists first
  const { data: columns, error: checkError } = await supabase
    .from('tasks')
    .select('*')
    .limit(1)
  
  if (checkError) {
    console.error('Error checking tasks table:', checkError)
    return
  }
  
  // Try to query with due_date to see if it exists
  const { error: dueDateError } = await supabase
    .from('tasks')
    .select('due_date')
    .limit(1)
  
  if (dueDateError && dueDateError.message.includes('due_date')) {
    console.log('due_date column does not exist, needs migration')
    console.log('\n========================================')
    console.log('MANUAL MIGRATION REQUIRED')
    console.log('========================================')
    console.log('Please run the following SQL in the Supabase Dashboard:')
    console.log('\n1. Go to: https://supabase.com/dashboard/project/ftqxodjocweksnrmqvpk')
    console.log('2. Navigate to: SQL Editor')
    console.log('3. Run this SQL:')
    console.log('\n--- COPY BELOW ---')
    console.log(`
-- Add due_date column to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS due_date date;

-- Add index for due_date queries
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(user_id, due_date);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public';
`)
    console.log('--- END COPY ---')
    console.log('\nMigration file saved at: supabase/migrations/001_add_due_date.sql')
  } else {
    console.log('✅ due_date column already exists!')
  }
}

migrate()
