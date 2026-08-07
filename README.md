# Sunset Social Golf League

Website / web app for the **Sunset Social Golf League** at Westhaven Golf Course —
standings, weekly schedule, team rosters, rules, and bylaws. Built with
Next.js (App Router) + TypeScript + Tailwind CSS, and deploys to Vercel with no
configuration.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm start        # serve the production build
```

## How to update the site each week

All league content lives in plain data files — no database. Edit the file,
commit, and redeploy (Vercel redeploys automatically on push).

| What to change | File |
| --- | --- |
| Team rosters, phone numbers, **team & individual points (standings)** | `src/data/league.ts` → `TEAMS` |
| Substitutes | `src/data/league.ts` → `SUBS` |
| Weekly schedule & match-ups | `src/data/league.ts` → `SCHEDULE` |
| Weekly recap (low scores, 50/50 winner) | `src/data/league.ts` → `RECAPS` |
| "As of" dates and contact info | `src/data/league.ts` → `LEAGUE` |
| Rules | `src/data/rules.ts` → `RULES` |
| Bylaws | `src/data/rules.ts` → `BYLAWS` |

Standings tables are computed automatically from the `points` values on each
team and player, so you only update the numbers in one place.

### Typical weekly workflow

1. After league night, open `src/data/league.ts`.
2. Update each team's `points` and each player's `points`.
3. Add a new entry to `RECAPS` for the night's low scores / 50/50 winner.
4. Bump `LEAGUE.standingsAsOf` to the new date.
5. Commit and push — the site redeploys.

## Pages

- **Home** — hero, current leader, next play date, standings & points-leader previews.
- **Standings** — full team standings and the individual points leaderboard.
- **Schedule** — season timeline with match-ups, fun nights, and the banquet.
- **Teams** — all rosters with phone numbers, points, and the sub list.
- **Rules** — the full league rules (10-point match play, handicaps, etc.).
- **Bylaws** — league governance, officers, dues, and treasury rules.

## Notes on the seeded data

- Rosters and season-to-date points reflect the results sheet **as of Aug 6, 2026**.
- Phone numbers come from the team sheet **as of Apr 24, 2026**.
- Where the two disagreed (a few roster changes), the more recent results sheet wins.

## Deploying to Vercel

Import this repository in Vercel and accept the defaults (framework: Next.js).
No environment variables are required.
