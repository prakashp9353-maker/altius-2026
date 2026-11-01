# ALTIUS 2026 – College Fest Website
React + Vite + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage), deployed on Vercel.

## Setup
1. Create a Supabase project. Run `supabase/migrations/001_schema.sql` in **SQL Editor** (creates tables, RLS, leaderboard view, `event-posters` bucket, seeds the 17 departments).
2. **Authentication → Users → Add user** (email + password). Turn OFF public sign-ups under Auth settings.
3. Make that user an admin (SQL Editor):
   `insert into admin_profiles(user_id) select id from auth.users where email='you@example.com';`
4. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable key only, never the service-role key).
5. `npm install && npm run dev`. Admin is at `/admin`.
6. Deploy: push to GitHub, import in Vercel, add the two env vars. `vercel.json` handles SPA routing.

## Scoring (computed in the `leaderboard` SQL view, never edited manually)
Winner 5 + Runner-up 3 (approved results, once per placing) + participation (1/eligible student) + bonus (5/recipient). Rank ties: more first places, then more runner-ups, else joint rank.
Participation duplicates are blocked by a unique index (department + event/period); bonus by (department + reference label). All score changes are written to `score_audit_logs` by triggers.

## Known gaps
Rank movement column shows "–" (needs snapshot history). Logos are placeholders: replace the boxes in `src/App.tsx` with images in `public/`. Nothing here has been run against a live Supabase project.

## Admin data-entry safeguards
- Participation: only one record per department per event is accepted, regardless of reporting-label changes. Period-only records are unique per department and period label.
- Bonus: entries are manual aggregate counts. The system cannot identify duplicate students across different labels because no student-level attendance/identity records are stored. The administrator must verify the one-time eligibility before entering the count.
- When replacing an event poster, the new file is uploaded and the event row is saved before the old file is removed. A failed database save leaves the old poster intact and cleans up the new upload.
