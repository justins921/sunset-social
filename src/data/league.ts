// ---------------------------------------------------------------------------
// Sunset Social Golf League — league data
//
// This is the single source of truth for the site. To update the site week to
// week, edit the values below and redeploy. Rosters and standings reflect the
// most recent results sheet (as of 6 Aug 2026); phone numbers come from the
// team sheet (as of 24 Apr 2026).
// ---------------------------------------------------------------------------

export const LEAGUE = {
  name: "Sunset Social Golf League",
  season: 2026,
  course: "Westhaven Golf Course",
  coursePhone: "920.233.4640",
  playDay: "Wednesday",
  teeTimes: "3:00 – 4:20 pm",
  standingsAsOf: "August 6, 2026",
  rosterAsOf: "August 6, 2026",
  contact: {
    name: "Justin Sobojinski",
    email: "justin.sobojinski@gmail.com",
    phone: "920.527.8841",
  },
} as const;

export type Player = {
  /** Position on the team: A, B, C, or D */
  slot: "A" | "B" | "C" | "D";
  name: string;
  phone?: string;
  /** Individual points earned so far this season */
  points?: number;
};

export type Team = {
  id: number;
  name: string;
  players: Player[];
  /** Total team points so far this season */
  points: number;
};

// ---------------------------------------------------------------------------
// Teams & rosters (current) with season-to-date points
// ---------------------------------------------------------------------------

export const TEAMS: Team[] = [
  {
    id: 1,
    name: "Team 1",
    points: 222.5,
    players: [
      { slot: "A", name: "Ben Pitz", phone: "920.203.6054", points: 57.0 },
      { slot: "B", name: "Gary Clark", phone: "920.216.3919", points: 55.5 },
      { slot: "C", name: "Mike Riese", phone: "920.858.3890", points: 64.5 },
      { slot: "D", name: "Dick Armock", phone: "920.602.4147", points: 45.5 },
    ],
  },
  {
    id: 2,
    name: "Team 2",
    points: 226.0,
    players: [
      { slot: "A", name: "Mike D. Lloyd", phone: "920.410.3928", points: 41.0 },
      { slot: "B", name: "John Popp", phone: "920.379.9189", points: 53.0 },
      { slot: "C", name: "Peter Stueber", phone: "920.426.1114", points: 57.5 },
      { slot: "D", name: "Troy Ehnert", phone: "920.740.8406", points: 60.0 },
    ],
  },
  {
    id: 3,
    name: "Team 3",
    points: 225.5,
    players: [
      { slot: "A", name: "Jeff Scanlan", phone: "920.277.7083", points: 69.5 },
      { slot: "B", name: "Duane Bathke", phone: "920.420.1467", points: 48.5 },
      { slot: "C", name: "Al Yenter", phone: "920.410.7139", points: 52.0 },
      { slot: "D", name: "Rich Levine", phone: "920.252.1714", points: 41.5 },
    ],
  },
  {
    id: 4,
    name: "Team 4",
    points: 240.0,
    players: [
      { slot: "A", name: "Justin Sobojinski", phone: "920.527.8841", points: 58.5 },
      { slot: "B", name: "George Erikson", phone: "920.475.0880", points: 40.0 },
      { slot: "C", name: "Mike Lloyd", phone: "920.379.1615", points: 60.0 },
      { slot: "D", name: "Ken Kuenzl", phone: "920.235.2113", points: 61.5 },
    ],
  },
  {
    id: 5,
    name: "Team 5",
    points: 200.5,
    players: [
      { slot: "A", name: "Steve Scanlan", phone: "920.277.8030", points: 29.5 },
      { slot: "B", name: "Mike Sobojinski", phone: "920.216.9591", points: 60.0 },
      { slot: "C", name: "Dan Marschall", phone: "920.539.2311", points: 39.0 },
      { slot: "D", name: "Andy LeMaire", phone: "920.594.0652", points: 48.0 },
    ],
  },
  {
    id: 6,
    name: "Team 6",
    points: 221.0,
    players: [
      { slot: "A", name: "John Murphy", phone: "920.376.2617", points: 51.0 },
      { slot: "B", name: "Tom Asuma", phone: "920.242.2617", points: 35.5 },
      { slot: "C", name: "Scott Johnson", phone: "920.509.0588", points: 50.0 },
      { slot: "D", name: "Dick Hanusa", phone: "920.379.6187", points: 56.5 },
    ],
  },
  {
    id: 7,
    name: "Team 7",
    points: 207.5,
    players: [
      { slot: "A", name: "Dave Schutz", phone: "920.376.4691", points: 51.5 },
      { slot: "B", name: "Brian Robinson", phone: "920.216.0226", points: 37.5 },
      { slot: "C", name: "Anthony Foster", phone: "619.913.6667", points: 57.0 },
      { slot: "D", name: "Alan Lloyd", phone: "920.252.0892", points: 47.0 },
    ],
  },
  {
    id: 8,
    name: "Team 8",
    points: 217.0,
    players: [
      { slot: "A", name: "Kevin Dewing", phone: "920.252.9554", points: 50.0 },
      { slot: "B", name: "Terry Schroeder", phone: "920.203.0333", points: 54.5 },
      { slot: "C", name: "Bill Smith", phone: "920.379.2450", points: 45.5 },
      { slot: "D", name: "Dennis Payne", phone: "920.573.1503", points: 67.0 },
    ],
  },
  {
    id: 9,
    name: "Team 9",
    points: 207.0,
    players: [
      { slot: "A", name: "Andrew Gesell", phone: "715.570.7044", points: 52.5 },
      { slot: "B", name: "Bob Stueber", phone: "920.231.5725", points: 32.5 },
      { slot: "C", name: "Dan Schneider", phone: "920.420.2400", points: 38.5 },
      { slot: "D", name: "Brad Schultz", phone: "920.573.5579", points: 43.5 },
    ],
  },
  {
    id: 10,
    name: "Team 10",
    points: 227.0,
    players: [
      { slot: "A", name: "Jack O'Brien", phone: "920.233.4415", points: 54.0 },
      { slot: "B", name: "Phil Levine", phone: "920.420.4894", points: 65.5 },
      { slot: "C", name: "Jerry Stueber", phone: "920.279.1513", points: 36.5 },
      { slot: "D", name: "Jeff Stieg", phone: "920.312.4016", points: 49.0 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Substitutes
// ---------------------------------------------------------------------------

export type Sub = { name: string; phone?: string };

export const SUBS: Sub[] = [
  { name: "Ryan Payne", phone: "920.252.0133" },
  { name: "Chris Deringer", phone: "920.216.8448" },
  { name: "Jim Schwochert", phone: "920.379.8505" },
  { name: "Steve Scanlan", phone: "920.277.8030" },
  { name: "Scott Johnson", phone: "920.509.0588" },
  { name: "Tom Asuma", phone: "920.242.2617" },
  { name: "Mike Freundl" },
  { name: "D. Klapatauskas" },
  { name: "Steve Kohler" },
];

// ---------------------------------------------------------------------------
// Weekly schedule. `matchups` are "team vs team" pairings for the night.
// ---------------------------------------------------------------------------

export type ScheduleWeek = {
  date: string; // ISO date
  label: string; // display date
  note?: string; // fun night / position round / banquet note
  matchups?: string[];
};

export const SCHEDULE: ScheduleWeek[] = [
  { date: "2026-04-30", label: "Apr 30", note: "Practice Round" },
  { date: "2026-05-07", label: "May 7", matchups: ["10 v 1", "8 v 3", "7 v 4", "9 v 2", "5 v 6"] },
  { date: "2026-05-14", label: "May 14", matchups: ["1 v 2", "4 v 9", "10 v 3", "8 v 5", "6 v 7"] },
  { date: "2026-05-21", label: "May 21", matchups: ["1 v 3", "4 v 2", "9 v 6", "10 v 5", "8 v 7"] },
  {
    date: "2026-05-28",
    label: "May 28",
    note: "Brats & Burgers Night · FUN NIGHT · Red, White & Blue",
  },
  { date: "2026-06-04", label: "Jun 4", matchups: ["1 v 4", "6 v 2", "10 v 7", "9 v 8", "5 v 3"] },
  { date: "2026-06-11", label: "Jun 11", matchups: ["5 v 1", "4 v 6", "7 v 3", "8 v 2", "9 v 10"] },
  { date: "2026-06-18", label: "Jun 18", matchups: ["6 v 1", "8 v 4", "9 v 3", "5 v 7", "10 v 2"] },
  {
    date: "2026-06-25",
    label: "Jun 25",
    note: "Perch Fry & Potato Salad Night · Position Round",
  },
  { date: "2026-07-02", label: "Jul 2", matchups: ["7 v 1", "8 v 6", "5 v 9", "10 v 4", "3 v 2"] },
  { date: "2026-07-09", label: "Jul 9", matchups: ["8 v 1", "10 v 6", "9 v 7", "5 v 2", "3 v 4"] },
  { date: "2026-07-16", label: "Jul 16", matchups: ["9 v 1", "4 v 5", "2 v 7", "3 v 6", "10 v 8"] },
  {
    date: "2026-07-23",
    label: "Jul 23",
    matchups: ["3 v 8", "2 v 9", "1 v 10", "6 v 5", "4 v 7 (Rain Makeup)"],
  },
  {
    date: "2026-07-30",
    label: "Jul 30",
    note: "Chicken Tender & Fries · FUN NIGHT · 3 Clubs",
  },
  {
    date: "2026-08-06",
    label: "Aug 6",
    matchups: ["2 v 1", "7 v 6", "3 v 10", "9 v 4", "5 v 8 (Rain Makeup)"],
  },
  {
    date: "2026-08-13",
    label: "Aug 13",
    matchups: ["5 v 10", "6 v 9", "7 v 8", "3 v 1", "2 v 4 (Rain Makeup)"],
  },
  { date: "2026-08-20", label: "Aug 20", note: "Position Round" },
  {
    date: "2026-08-27",
    label: "Aug 27",
    note: "Banquet Night · Flight Night · Go off with any league member",
  },
];

// ---------------------------------------------------------------------------
// Weekly highlights (from the results sheet). Add a new entry each week.
// ---------------------------------------------------------------------------

export type WeeklyRecap = {
  week: number;
  label: string; // e.g. "Aug 6"
  lowScores?: string;
  fiftyFifty?: string;
  matchups?: string[];
};

export const RECAPS: WeeklyRecap[] = [
  {
    week: 15,
    label: "Aug 6",
    lowScores: "Ben Pitz — Even Par 35 · Jeff Scanlan — 37",
    fiftyFifty: "Mike & Alan Lloyd — $130",
    matchups: ["5 v 10", "6 v 9", "7 v 8", "3 v 1", "2 v 4"],
  },
];

// ---------------------------------------------------------------------------
// Fun-night formats (referenced by the schedule notes)
// ---------------------------------------------------------------------------

export const FUN_NIGHTS = [
  {
    name: "Red, White & Blue",
    description:
      "Everyone tees off from the RED tees on holes 1, 4, and 7; the WHITE tees on holes 2, 5, and 8; and the BLUE tees on holes 3, 6, and 9. The lowest score from each of the four flights wins. Go off with anyone ready to play.",
  },
  {
    name: "3 Clubs",
    description:
      "Each golfer selects any three clubs from their bag to use for the round. The player in each flight with the lowest score wins. Tee off with anyone ready to play.",
  },
];
