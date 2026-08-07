# Sunset Social Golf League

Website / web app for the **Sunset Social Golf League** at Westhaven Golf Course —
standings, weekly **results**, schedule, team rosters, rules, bylaws, and a
password-protected **secretary score-entry** area. Built with Next.js (App
Router) + TypeScript + Tailwind CSS, backed by Postgres (Vercel Postgres / Neon),
and deploys to Vercel.

The site works with **or without** a database:

- **No database** → the public site renders from the static seed data in
  `src/data`. Standings show the season-to-date totals; the admin area shows
  setup instructions.
- **With a database** → standings and the results page are driven live from
  Postgres, and the secretary can post scores each week from `/admin`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm start        # serve the production build
```

For local dev with the database features, copy `.env.example` to `.env.local`
and set `POSTGRES_URL` (any Postgres) and `ADMIN_PASSWORD`.

## Deploying to Vercel (one-time setup)

1. **Import the repo** in Vercel and accept the Next.js defaults.
2. **Add a Postgres store**: Project → **Storage** → **Create Database** →
   **Postgres**, and connect it to the project. Vercel injects `POSTGRES_URL`
   automatically — no manual copy/paste. The tables and the current standings
   **seed themselves** on first load.
3. **Set the admin password**: Project → **Settings** → **Environment
   Variables** → add `ADMIN_PASSWORD` (any secret only the secretary knows).
4. **Redeploy** so the new env vars take effect.

That's it. Visit `/admin` and sign in with the password to post scores.

## Weekly workflow (secretary)

Once the database is connected, week-to-week updates happen **in the browser** —
no code changes:

1. Go to `/admin` and sign in.
2. Pick the week.
3. Enter each golfer's 9-hole **strokes** and **points**, set any Sub / Absent /
   Forfeit / Rainout statuses, and fill in the night's **low score** and **50/50
   winner**.
4. **Save week.** The public [standings](/standings), [results](/results), home,
   and [teams](/teams) pages update immediately.

Points entered for a week **add** to the season totals.

### About the 2026 baseline

The season-to-date totals through **Aug 6, 2026** (Team 4 leading at 240.0, etc.)
are seeded from the results sheet and marked as "baseline" weeks. Enter the
weeks *after* Aug 6 going forward — their points add on top. For a brand-new
season, reset the baseline numbers to `0` in `src/data/league.ts` (see below)
and enter every week from scratch.

## Editing league content in code

Rosters, schedule, rules, and bylaws live in plain data files. Editing them and
pushing redeploys the site. (Team/player `points` here are the **baseline**
totals used to seed the database the first time; after that, weekly scores come
from `/admin`.)

| What to change | File |
| --- | --- |
| Team rosters, phone numbers, baseline points | `src/data/league.ts` → `TEAMS` |
| Substitutes | `src/data/league.ts` → `SUBS` |
| Weekly schedule & match-ups | `src/data/league.ts` → `SCHEDULE` |
| "As of" dates and contact info | `src/data/league.ts` → `LEAGUE` |
| Rules | `src/data/rules.ts` → `RULES` |
| Bylaws | `src/data/rules.ts` → `BYLAWS` |

## Pages

- **Home** — hero, current leader, next play date, standings & points-leader previews.
- **Standings** — full team standings and the individual points leaderboard.
- **Results** — per-week scorecards, points, low rounds, and 50/50 winners.
- **Schedule** — season timeline with match-ups, fun nights, and the banquet.
- **Teams** — all rosters with phone numbers, points, and the sub list.
- **Rules** / **Bylaws** — the league's governing documents.
- **/admin** — password-gated score entry (not linked in the public nav).

## Architecture notes

- `src/lib/db.ts` — Postgres connection + idempotent schema/seed (runs itself
  on first query; safe to call on every request).
- `src/lib/queries.ts` — all reads/writes, each with a static fallback so the
  public site never breaks if the DB is briefly unavailable.
- `src/lib/auth.ts` — minimal single-password admin auth via a signed,
  httpOnly cookie (HMAC-SHA256, constant-time compare). No user table.
- Standings are recomputed from the database as `baseline + Σ(weekly points)`
  for both teams and individuals.

## Seeded data provenance

- Rosters and season-to-date points reflect the results sheet **as of Aug 6, 2026**.
- Phone numbers come from the team sheet **as of Apr 24, 2026**.
- Where the two disagreed (a few roster changes), the more recent results sheet wins.
