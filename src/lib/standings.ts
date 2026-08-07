import { TEAMS, type Team, type Player } from "@/data/league";

export type RankedTeam = Team & { place: number };

export function teamStandings(): RankedTeam[] {
  return [...TEAMS]
    .sort((a, b) => b.points - a.points)
    .map((t, i) => ({ ...t, place: i + 1 }));
}

export type RankedPlayer = Player & {
  teamId: number;
  teamName: string;
  place: number;
};

export function individualStandings(): RankedPlayer[] {
  const players: Omit<RankedPlayer, "place">[] = [];
  for (const team of TEAMS) {
    for (const p of team.players) {
      players.push({ ...p, teamId: team.id, teamName: team.name });
    }
  }
  return players
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .map((p, i) => ({ ...p, place: i + 1 }));
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
