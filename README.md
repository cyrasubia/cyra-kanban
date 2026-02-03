# Cyra Command Center

Victor's AI Operations Dashboard with Supabase auth.

## Environment variables

Set these on the server (Vercel environment, etc.). Do not paste secrets into chat.

- `CYRA_TASKS_API_KEY=` – bearer token that protects the new `/api/cyra/tasks` endpoint.
- `SUPABASE_URL=` – the Supabase project URL (never use a public preview key for service operations).
- `SUPABASE_SERVICE_ROLE_KEY=` – service role key used only on the server to insert tasks.
- `VICTOR_USER_ID=` (optional) – if set, the automated endpoint will insert tasks for this user without looking up the first profile.

## Local testing

Once the app is running (`npm run dev`), exercise the new endpoint via curl:

```bash
curl -X POST http://localhost:3000/api/cyra/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CYRA_TASKS_API_KEY" \
  -d '{"title":"Follow up with Travis","client_name":"Phoinix Transformations"}'
```

The endpoint validates the bearer token, resolves the Victor user ID, and inserts the task with defaults (inbox column, medium priority, auto-incremented position). Source/due-date fields are ignored because the current schema only exposes `project`, `priority`, `column_id`, etc.
