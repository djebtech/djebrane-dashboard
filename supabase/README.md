# Supabase — database & migrations

The database schema is managed with the **Supabase CLI** and version-controlled
in `supabase/migrations/`. Schema changes ship from this repo, not by pasting
SQL into the dashboard.

## One-time setup (per machine)

```bash
# 1. Authenticate the CLI (opens a browser; token stored in ~/.supabase)
supabase login

# 2. Link this repo to the hosted project (prompts for the DB password)
supabase link --project-ref oemsnsziaihhjjtufikn
```

`supabase login` and `supabase link` are the only steps that touch secrets —
they are not stored in this repo.

## Project

- **Project ref:** `oemsnsziaihhjjtufikn`
- **Local id (config.toml):** `Djebrane_Dashboard`

## Migration history

`001`–`003` were applied **by hand in the SQL Editor** before the CLI was
adopted, so they are registered as already-applied in the remote migration
history (they are not re-run):

```bash
supabase migration repair --status applied 001 002 003
```

| Version | File                              | Adds                                              |
|---------|-----------------------------------|---------------------------------------------------|
| 001     | `001_campaign_engine.sql`         | campaign engine columns, message_logs upsert key, increment_campaign_* fns |
| 002     | `002_sequence_enrollments.sql`    | sequence targeting cols, `sequence_enrollments` table + RLS |
| 003     | `003_templates.sql`               | `templates` table + RLS, `contacts_list_phone_unique` constraint |

## Everyday workflow

```bash
# Create a new migration
supabase migration new <name>          # -> supabase/migrations/<timestamp>_<name>.sql
# ...edit the generated SQL...

# Preview what would run against the remote
supabase db push --dry-run

# Apply pending migrations to the hosted project
supabase db push

# See local vs remote migration state
supabase migration list
```

Commit the generated migration file alongside the code that depends on it.
Pushing to GitHub does **not** apply migrations — run `supabase db push`.
