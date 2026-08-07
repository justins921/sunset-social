// Sunset Social Golf League — Rules (as of April 18, 2025)

export const RULES_AS_OF = "April 18, 2025";

export type Rule = {
  n: number;
  title: string;
  body: string[];
};

export const RULES: Rule[] = [
  {
    n: 1,
    title: "Tee times & tee selection",
    body: [
      "Tee-off times are from 3:00 pm to 4:20 pm. Please call your opponent if you cannot make it so he doesn't have to wait around. Try to talk to your opponent the week before your match to determine what time to show up.",
      "If you did not contact your opponent, or he has not shown up, you are free to tee off with any remaining group provided it is 4:30 pm or later.",
      "Players under the age of 65 tee off from the WHITE tees; players 65 and over may tee off from the GOLD tee; players 80 and over may tee off from the RED tee. If a senior elects to use the GOLD or RED tee he must use that tee all year. Whatever tee you start the league using is the tee you must use all year long.",
    ],
  },
  {
    n: 2,
    title: "Playing ahead & make-ups",
    body: [
      "If you cannot play your match on a scheduled night or cannot find a substitute, you may play the match with your opponent ahead of time provided you both agree on when to play. Failure to agree results in a forfeit (see Rule 9).",
      "No matches can be made up after the scheduled league day — they must be played before.",
      "When a player can't make a scheduled date they can play ahead; however, if there is a rainout for that date the play-ahead scores will not be used.",
    ],
  },
  {
    n: 3,
    title: "A match is nine holes",
    body: [
      "A match consists of nine holes. To receive the points for a match the player must complete the entire match. Failure to complete the match results in a forfeiture of the unplayed holes.",
    ],
  },
  {
    n: 4,
    title: "Rules of play",
    body: [
      "USGA rules cover all play, with local course rules also applying, with the following exceptions:",
      "a. Winter rules apply throughout the season and not just in the fairway. This does not apply in a bunker, penalty areas, or on a putting green. A ball on the fringe of a putting green may not be moved onto the putting surface. The ball must be marked when lifted regardless of where you are on the course. Generally a ball can be moved six inches from the original marked spot so long as it does not improve the lie. Lifting a ball without marking first is a one-stroke penalty.",
      "b. At any time during the play of an individual hole, the ball in play may be substituted. This also applies to clean and place.",
    ],
  },
  {
    n: 5,
    title: "Rainy days",
    body: [
      "a. Show up! All members present will decide whether to play. This decision is made by 3:30 pm.",
      "b. If play is interrupted by rain the league will either be called off or continued to a conclusion as determined by league players at the time, or if golf course staff suspends play.",
      "c. Rain dates are made up according to the schedule. When golf carts are not allowed out, the league cancels golf.",
      "d. Points acquired before a rainout are recorded. Holes not completed are halved and points recorded.",
    ],
  },
  {
    n: 6,
    title: "Lost ball / out of bounds",
    body: [
      "Alternative to distance and a stroke penalty: If your ball is lost or out of bounds you can determine where your ball is, or is believed to be, or where it went out of bounds. Go to the edge of the fairway using line of sight, but not closer to the pin, and drop a ball within two club lengths in the usual way. This costs two strokes.",
      "This cannot be used if you hit a provisional ball, or in a penalty area marked by a red or yellow stake (i.e. in the water). Balls lost over any fence or white stake are out of bounds.",
      "If it is determined after your tee shot that your ball is out of bounds, hit a provisional ball as you will not be allowed to return to the tee box. If no provisional was hit you must use the normal distance-and-stroke penalty or the alternative above.",
      "Gauge how long you look for your ball based on the group behind you, but no more than three (3) minutes. Don't hold up play!",
    ],
  },
  {
    n: 7,
    title: "Count every stroke",
    body: [
      "All strokes per hole are counted and recorded. So it's possible to record a 7 or more on a par 3, a 9 or more on a par 4, and an 11 or more on a par 5.",
    ],
  },
  {
    n: 8,
    title: "Scoring — the 10-point system",
    body: [
      "Match play applies. The following 10-point system applies:",
      "a. One point for winning the hole.",
      "b. One-half point for a tied hole.",
      "c. One point for winning the most holes.",
      "d. One-half point for a tied match.",
      "e. All team scores are counted in the standings total.",
    ],
  },
  {
    n: 9,
    title: "Forfeitures",
    body: [
      "On all forfeitures, a score of six points is awarded to the player present and completing the match. The player present can earn beyond six points under the following conditions:",
      "a. The player present plays against a bogie course. Example: the course rates hole one as a par four; it becomes a par five. Score a four and you win the hole; a six and you lose; a five halves the hole. The rest of the holes are played similarly, as each hole is rated. All inquiries should be put to league officials for settlement that night.",
      "b. If a player is absent, 3½ points are awarded to their team, while the absent player receives zero points for the match. If the present golfer wins more than six points, the absent player's team receives the remaining points needed to total 10, but the absent player still earns no individual points.",
    ],
  },
  {
    n: 10,
    title: "Handicaps",
    body: [
      "Individual handicaps are computed weekly based on the current average, except at the beginning of the league when last year's average is used. This average is used for four weeks (with one week dropping off each week when a new score is posted).",
      "The base for handicap is the current average for nine holes minus par 35. No strokes over double par (70) or double par per hole are used to compute handicaps. At the end of week four, members of the same team may be re-evaluated.",
    ],
  },
  {
    n: 11,
    title: "Inquiries & disputes",
    body: [
      "All inquiries/disputes are to be voiced in the presence of two league officials, on the night the inquiry/dispute occurred, for settlement.",
    ],
  },
  {
    n: 12,
    title: "Tie-breakers",
    body: [
      "At the end of the season, if more than one team is tied for the top three positions, the teams play against each other on Flight Night. If the tie is not broken, scores of all team players are added and the team with the lowest total score wins. If this does not determine a winner, a flip of a coin by the league's president determines the winner. (In the absence of the President, the Vice President or Secretary/Treasurer may perform this duty.)",
    ],
  },
  {
    n: 13,
    title: "Repeated forfeits",
    body: [
      "When a player forfeits two weeks of play, he is subject to evaluation by the officers for possible dismissal. No refund of dues! Don't forget guys — THIS IS A FUN LEAGUE.",
    ],
  },
];

// Sunset Social Golf League — Bylaws (last updated 2025; dated April 23, 2026)

export const BYLAWS_AS_OF = "April 23, 2026";

export const BYLAWS: string[] = [
  "This is a male-only league.",
  "This league is constituted by electing three officers: a President, a Vice President, and a Secretary/Treasurer. All officers are selected on the night of the banquet.",
  "The running of the league meeting is conducted by the President using Parliamentary Procedures. In the absence of the President, the Vice President presides.",
  "A quorum must be present for a meeting to be conducted. A quorum is 50% of the league, of which two elected officials must be present. Example: a 48-member league requires 24 members present, of which two must be elected officers.",
  "For any motion to become part of the bylaws, a “YES” vote of over 50% of the quorum is required.",
  "The Secretary records who was present for each meeting in addition to what was discussed, voted on, and the results. In the absence of the Secretary, the Vice President performs the secretarial duties. A copy of the meeting is posted on the course bulletin board.",
  "The Treasurer keeps complete and accurate records of all monies coming in and going out. No misc. expenses are allowed. The Treasurer keeps receipts until a signed verified report is made by the President and Vice President. After the report is verified and signed by all officers, receipts can be disposed of. This verification can be conducted as often as needed but will be conducted before the night of the banquet.",
  "A Secretary and Treasury report of the previous meeting is read at the beginning of each new meeting. This requirement may be waived at the banquet.",
  "A complete Treasury report of all income and debit transactions is submitted to each league member via email no later than the day after the banquet.",
  "Upon the election of a new Secretary/Treasurer, all papers, reports, and checkbook(s) are turned over to the new Secretary/Treasurer. The new officers ensure a verified Treasurer report is made and signed by all outgoing officers.",
  "The new Treasurer gives the outgoing Treasurer a receipt for all monies made at the banquet and what is left in the league checking account.",
  "All monies (except for the banquet 50/50) made at the banquet are used for the upcoming league year. Banquet monies are not used to fund the subsequent year's banquet.",
  "The Secretary keeps all golf scorecards until the season has ended.",
  "All members pay a $50.00 annual membership fee. Fees must be paid by the second league night.",
  "A fee of $5.00 per league golfer is paid to the Secretary/Treasurer as a salary for services rendered. In addition, he is not required to pay the annual membership fee.",
  "A copy of the Sunset Social Golf League Rules and Bylaws is furnished to each member at the beginning of each season, in addition to all supporting documents (Team Listing and Weekly Schedule).",
];
