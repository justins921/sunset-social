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
3. Enter each golfer's 9-hole **strokes** and **points**, the **team points**
   per team, set any Sub / Absent / Forfeit / Rainout statuses, and fill in the
   night's **low score** and **50/50 winner**.
4. **Save week.** The public [standings](/standings), [results](/results), home,
   and [teams](/teams) pages update immediately.

Points entered for a week **add** to the season totals.

### The 2026 season is pre-loaded

Every league night from **May 7 through Aug 6, 2026** is already in the database,
reconstructed from the weekly results PDFs in `src/data/season2026.ts`:

- Per-player 9-hole **strokes** and **points** for all 40 golfers.
- Per-team **points** for each night.
- Each night's low score and 50/50 winner.

Standings are the running **sum of every week's points**, and they reproduce the
official totals exactly (Team 4 at 240.0, Jeff Scanlan at 69.5, etc.). Just enter
each new night from Aug 13 onward. For a brand-new season, clear
`src/data/season2026.ts` (set it to `[]`) so the season starts empty.

Every value in `season2026.ts` was validated on import: each player's weekly
strokes sum to their printed stroke total, and the weekly team and individual
points sum exactly to the official season totals.

### Team points vs. individual points

A team's official total is **not** the sum of its four players' individual
points — under Rule 9, absent players still earn points for their team. So team
standings have their own points series. In the admin form you enter a **Team
points** value per team for the night, alongside each golfer's strokes and
points.

## Editing league content in code

Rosters, schedule, rules, and bylaws live in plain data files. Editing them and
pushing redeploys the site. (Team/player `points` in `league.ts` are only the
no-database **fallback** totals; when a database is connected, all points come
from the weekly results.)

| What to change | File |
| --- | --- |
| The pre-loaded 2026 weekly scores | `src/data/season2026.ts` → `SEASON_2026` |
| Team rosters, phone numbers, fallback points | `src/data/league.ts` → `TEAMS` |
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
- **/admin** — password-gated secretary tools (not linked in the public nav):
  - **Score entry** — weekly strokes/points with auto-calculated team points.
  - **Teams & roster** (`/admin/roster`) — set players and subs, and "start a new
    season" (clears scores/dues, keeps the roster & schedule).
  - **Schedule** (`/admin/schedule`) — edit each week's date/label/note/matchups,
    or auto-generate a round-robin across the playing weeks.
  - **Treasury** (`/admin/treasury`) — mark $50 dues paid per member, keep an
    income/expense ledger, and see the running balance (the post-banquet report).
  - **Minutes** (`/admin/minutes`) — record each meeting's date, notes, and an
    attendance checklist with a live quorum indicator (Bylaw 4). Minutes are
    posted for members on the public `/minutes` page.
  - **Season archive** (`/admin/seasons`) — every past season, saved in full.

"Start a new season" first **archives the entire current season** (roster,
schedule, scores, team points, recaps, dues, ledger, minutes, and final
standings) into the season archive, then clears it for the year ahead — so
nothing is ever lost.

Once a database is connected and initialized, the **database is the source of
truth** for rosters and the schedule — admin edits persist across redeploys, and
the `src/data` files are only the first-time seed. Handicaps (Rule 10) are
computed from entered strokes and shown on the standings and teams pages.

## Architecture notes

- `src/lib/db.ts` — Postgres connection + idempotent schema/seed (runs itself
  on first query; safe to call on every request).
- `src/lib/queries.ts` — all reads/writes, each with a static fallback so the
  public site never breaks if the DB is briefly unavailable.
- `src/lib/auth.ts` — minimal single-password admin auth via a signed,
  httpOnly cookie (HMAC-SHA256, constant-time compare). No user table.
- Standings are recomputed from the database as the sum of weekly points —
  team standings from the per-team series, individual standings from the
  per-player series (the two differ by absent-fill team points, per Rule 9).

## Seeded data provenance

- Rosters and season-to-date points reflect the results sheet **as of Aug 6, 2026**.
- Phone numbers come from the team sheet **as of Apr 24, 2026**.
- Where the two disagreed (a few roster changes), the more recent results sheet wins.
