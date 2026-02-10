# Cyra Command Center

Victor's AI Operations Dashboard with Supabase auth, Google Calendar sync, and recurring tasks support.

## Features

- **Kanban Board** - Drag-and-drop task management
- **Calendar View** - Visualize tasks with due dates
- **Google Calendar Sync** - Automatically sync tasks to Google Calendar
- **Recurring Tasks** - Create tasks that repeat daily, weekly, monthly, or yearly
- **Real-time Updates** - Live collaboration with Supabase realtime

## Environment Variables

Set these on the server (Vercel environment, etc.). Do not paste secrets into chat.

### Required
- `CYRA_TASKS_API_KEY=` – bearer token that protects the `/api/cyra/tasks` endpoint.
- `SUPABASE_URL=` – the Supabase project URL (never use a public preview key for service operations).
- `SUPABASE_SERVICE_ROLE_KEY=` – service role key used only on the server to insert tasks.
- `NEXT_PUBLIC_SUPABASE_URL=` – the Supabase project URL for client-side usage.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` – the Supabase anon key for client-side usage.

### Optional
- `VICTOR_USER_ID=` – if set, the automated endpoint will insert tasks for this user without looking up the first profile.
- `VICTOR_EMAIL=` – email to look up the Victor user profile (default: victor@insiderclicks.com)

### Google Calendar Integration (Optional)
- `GOOGLE_CLIENT_ID=` – Google OAuth client ID
- `GOOGLE_CLIENT_SECRET=` – Google OAuth client secret
- `NEXT_PUBLIC_APP_URL=` – your app's URL (e.g., https://your-domain.vercel.app)

## Database Setup

Run the migrations in the `supabase/migrations/` folder in order:

1. `schema.sql` - Initial schema
2. `001_add_due_date.sql` - Add due_date column
3. `002_add_calendar_sync_and_recurrence.sql` - Add Google Calendar sync and recurrence fields

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your values.

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## API Endpoints

### Create Task (Cyra Integration)
```bash
curl -X POST http://localhost:3000/api/cyra/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CYRA_TASKS_API_KEY" \
  -d '{
    "title": "Follow up with Travis",
    "client_name": "Phoinix Transformations",
    "due_date": "2026-02-15",
    "priority": "high"
  }'
```

### Google Calendar Sync
Tasks with `due_date` will automatically sync to Google Calendar when:
1. Google Calendar is connected in Settings
2. Auto-sync is enabled
3. The task has a due date

### Recurring Tasks
When creating a task, you can set it to recur:
- **Daily** - Every N days
- **Weekly** - Every N weeks on selected days
- **Monthly** - Every N months
- **Yearly** - Every year

Recurring tasks use RRULE format and will display on all occurrence dates in the calendar view.

## Deployment

The app is configured for Vercel deployment:

```bash
vercel --prod
```

Make sure to set all environment variables in the Vercel dashboard before deploying.

## Changelog

### v0.2.0 - Calendar Enhancements
- Added Google Calendar sync integration
- Added recurring tasks support (RRULE)
- Updated Calendar view to show recurring instances
- Added Settings page for Google Calendar connection
