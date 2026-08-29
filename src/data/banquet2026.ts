// Banquet script / run-of-show, transcribed from the 2026 Banquet Celebration
// booklet the outgoing secretary produced. Everything here is editable from the
// admin Banquet page; this file is only the one-time seed so the tool ships with
// a working template that already matches the league's format.

export type DoorPrize = {
  /** Draw order, 1..N as announced from the podium. */
  n: number;
  /** What the prize is, e.g. "TaylorMade SIM2 MAX Irons". */
  item: string;
  /** How many winners this prize has (number of name lines). */
  count: number;
  /** Typed winner names for the "final copy" print; blank lines otherwise. */
  winners: string[];
};

export type FlightWinner = { flight: string; name: string; net: string };
export type HoleEvent = { label: string; winner: string };
export type OfficeNomination = { office: string; name: string };

// Awards computed from the standings (see getBanquetAwards). The same shape is
// used for the optional manual override stored on the banquet record.
export type MvpEntry = {
  teamId: number;
  teamName: string;
  name: string;
  points: number;
};
export type PlaceEntry = {
  place: number;
  teamId: number;
  teamName: string;
  points: number;
  players: string[];
};
export type ImprovedEntry = {
  teamId: number;
  teamName: string;
  name: string;
  firstAvg: number;
  secondAvg: number;
};
export type BanquetAwards = {
  leagueMvps: MvpEntry[];
  teamMvps: MvpEntry[];
  placeWinners: PlaceEntry[];
  mostImproved: ImprovedEntry | null;
};

export type BanquetData = {
  year: number;
  welcome: string;
  raffleIntro: string;
  sponsorName: string;
  sponsorIntro: string;
  doorPrizes: DoorPrize[];
  flightNight: FlightWinner[];
  holeEvents: HoleEvent[];
  mvpAwardName: string;
  improvedAwardName: string;
  championAwardName: string;
  fiftyFiftyAmount: string;
  fiftyFiftyWinner: string;
  electionSeason: string;
  officers: OfficeNomination[];
  fallNote: string;
  springMeeting: string;
  /** When set, prints instead of the standings-computed awards. */
  awardsOverride: BanquetAwards | null;
};

const dp = (n: number, item: string, winners: string[]): DoorPrize => ({
  n,
  item,
  count: winners.length,
  winners,
});

export const BANQUET_2026: BanquetData = {
  year: 2026,
  welcome:
    "Terry brings the League to order and thanks everyone for being here tonight. " +
    "League members please come to order. Either later this evening or by tomorrow " +
    "morning, you will receive an email containing the final results for all seventeen " +
    "weeks of play. That message will also include the season's complete financial " +
    "report along with tonight's activities.",
  raffleIntro:
    "Everyone should now have their twenty Fun Night raffle tickets which are to be " +
    "used exclusively for this evening's prize drawings. We have two high value items " +
    "tonight. One is valued at over $600 and another at nearly $500. So, if you'd like " +
    "to increase your chances, additional Fun Night raffle tickets are still available " +
    "for purchase, as well as 50/50 tickets. Settle in, enjoy the night, and good luck " +
    "in the drawings.",
  sponsorName: "Golfers Outlet",
  sponsorIntro:
    "Before we begin handing out the door prizes, a quick note of appreciation. " +
    "Golfers Outlet is the generous source of all the prizes you see tonight. They've " +
    "supported our league throughout the season, and they extend that support to each " +
    "of you personally. When you check out at their store, simply mention that you're a " +
    "member of the Sunset Social Golf League and you'll receive at least a ten percent " +
    "discount on your purchase. It's a great way to thank them for backing our league " +
    "while treating yourself to something new for your game.",
  doorPrizes: [
    dp(1, "TaylorMade SIM2 MAX Irons", ["Brad Schultz"]),
    dp(2, "Titleist Scotty Cameron Putter with Cover", ["Ben Pitz"]),
    dp(3, "TaylorMade Qi4D Adjustable Fairway 9 Wood with Cover", ["Tom Asuma"]),
    dp(4, "Titleist GT2 Adjustable Fairway 7 Wood with Cover", ["Dan Schneider"]),
    dp(5, "Titleist GT2 Adjustable Fairway 5 Wood with Cover", ["Ken Kuenzl"]),
    dp(6, "Vortex Blade Golf Rangefinder", ["Phil Levine"]),
    dp(7, "3 — $100 Bills", ["Mike Riese", "Dick Hanusa", "Gary Clark"]),
    dp(8, "10 — Dozen Titleist Pro V1X", [
      "Andrew Gesell",
      "Mike Riese",
      "Mike Riese",
      "Jerry Stueber",
      "Phil Levine",
      "Andrew Gesell",
      "Andrew Gesell",
      "John Murphy",
      "Jerry & Peter Stueber",
      "Duane Bathke",
    ]),
    dp(9, "Westhaven 18 Holes with Cart for FOUR", ["Justin Sobojinski"]),
    dp(10, "6 — Greene's Pour House $50 Gift Card", [
      "Dick Hanusa",
      "Dick Hanusa",
      "Mike Muza",
      "Jeff Scanlan",
      "Dick Armock",
      "Bill Smith",
    ]),
    dp(11, "3 — Sleeve of Titleist Pro V1X with Free Pour House Burger", [
      "Dick Armock",
      "Mike Lloyd",
      "Dave Schutz",
    ]),
  ],
  flightNight: [
    { flight: "A", name: "Ben Pitz", net: "27" },
    { flight: "B", name: "Gary Clark", net: "30" },
    { flight: "C", name: "Dan Marschall", net: "28" },
    { flight: "D", name: "Rich Levine", net: "24" },
  ],
  holeEvents: [{ label: "Holes 10-18", winner: "" }],
  mvpAwardName: "The Ken Kuenzl Award for the League's Most Valuable Player",
  improvedAwardName: "The Newman Whiley Award for the League's Most Improved Player",
  championAwardName: "Richard Dewing Memorial Award and League Champions",
  fiftyFiftyAmount: "160.00",
  fiftyFiftyWinner: "Jeff Steig",
  electionSeason: "2027",
  officers: [
    { office: "President", name: "Mike D. Lloyd" },
    { office: "Vice President", name: "Andrew Gesell" },
    { office: "Secretary/Treasurer", name: "Justin Sobojinski" },
  ],
  fallNote:
    "The Fall League will continue through the month of September. Those interested " +
    "come out and play. There will be a dollar sign-up sheet for those interested " +
    "where the low round will win the money. Handicaps will be used to determine the " +
    "winner.",
  springMeeting: "Thursday, 22 April 2027",
  // Seeded with the official 2026 numbers so the booklet is correct out of the
  // box even before every week of scores is entered. Clear it (from the admin
  // page) to fall back to the values computed live from the standings.
  awardsOverride: {
    leagueMvps: [
      { teamId: 3, teamName: "Team 3", name: "Jeff Scanlan", points: 79 },
      { teamId: 8, teamName: "Team 8", name: "Dennis Payne", points: 79 },
    ],
    teamMvps: [
      { teamId: 1, teamName: "Team 1", name: "Mike Riese", points: 77 },
      { teamId: 2, teamName: "Team 2", name: "Troy Ehnert", points: 70 },
      { teamId: 4, teamName: "Team 4", name: "Ken Kuenzl", points: 75.5 },
      { teamId: 5, teamName: "Team 5", name: "Mike Sobojinski", points: 68 },
      { teamId: 6, teamName: "Team 6", name: "Dick Hanusa", points: 69.5 },
      { teamId: 7, teamName: "Team 7", name: "Anthony Foster", points: 68 },
      { teamId: 9, teamName: "Team 9", name: "Andrew Gesell", points: 61 },
      { teamId: 10, teamName: "Team 10", name: "Phil Levine", points: 76.5 },
    ],
    placeWinners: [
      {
        place: 1,
        teamId: 4,
        teamName: "Team 4",
        points: 282.5,
        players: ["Justin Sobojinski", "George Erikson", "Mike Lloyd", "Ken Kuenzl"],
      },
      {
        place: 2,
        teamId: 10,
        teamName: "Team 10",
        points: 268.5,
        players: ["Jack O'Brien", "Phil Levine", "Jerry Stueber", "Jeff Steig"],
      },
      {
        place: 3,
        teamId: 2,
        teamName: "Team 2",
        points: 268,
        players: ["Mike D. Lloyd", "John Popp", "Peter Stueber", "Troy Ehnert"],
      },
    ],
    mostImproved: {
      teamId: 7,
      teamName: "Team 7",
      name: "Alan Lloyd",
      firstAvg: 63,
      secondAvg: 53,
    },
  },
};
