// 2026 Financial Report — transcribed from the treasurer's end-of-year balance
// sheet (Peter D. Stueber). Loaded once into the live treasury; totals reconcile
// exactly: 50/50 $2,135.00 + income $5,281.16 = grand total $7,416.16, minus
// debits $7,412.43 = money on hand $3.73.

export type FinIncome = { date: string; description: string; amount: number; category: string };
export type FinExpense = { date: string; description: string; amount: number; checkNo: string | null };
export type FinFifty = { date: string; amount: number; winner: string };

export const FIN_INCOME_2026: FinIncome[] = [
  { date: "2026-04-23", description: "Money made at 2025 Banquet", amount: 1801.16, category: "banquet" },
  {
    date: "2026-04-23",
    description:
      "Dues: Armock, Clark, Ehnert, Erikson, Foster, Gesell, P.Levine, R.Levine, A.Lloyd, Marschall, Payne, Pitz, Riese, Robinson, Schneider, Schroeder, D.Schultz, Schutz, Smith, M.Sobojinski, Stieg, B.Stueber, Yenter, S.Johnson",
    amount: 1200.0,
    category: "dues",
  },
  {
    date: "2026-04-23",
    description: "Dues: Bathke, Dewing, Kuenzl, M.Lloyd, M.D.Lloyd, Murphy, Popp, B.Schultz, J.Stueber",
    amount: 450.0,
    category: "dues",
  },
  { date: "2026-04-23", description: "Dues: Hanusa, LeMaire, J.Sobojinski", amount: 150.0, category: "dues" },
  { date: "2026-04-23", description: "Dues: J.Scanlan, O'Brien, T.Asuma", amount: 150.0, category: "dues" },
  { date: "2026-05-28", description: "FNR#1", amount: 500.0, category: "fnr" },
  { date: "2026-06-25", description: "FNR#2 — Tom Asuma $100, John Murphy $50", amount: 410.0, category: "fnr" },
  { date: "2026-07-30", description: "FNR#3", amount: 570.0, category: "fnr" },
  { date: "2026-08-27", description: "Misc", amount: 50.0, category: "other" },
];

export const FIN_EXPENSE_2026: FinExpense[] = [
  { date: "2026-05-28", description: "FNR#1", amount: 150.0, checkNo: "CK#1329" },
  { date: "2026-05-28", description: "Jeff's On Rugby — Brats & Burgers", amount: 280.0, checkNo: "CK#1330" },
  { date: "2026-06-25", description: "Jeff's On Rugby — Perch", amount: 320.0, checkNo: "CK#1331" },
  { date: "2026-06-25", description: "FNR#2", amount: 150.0, checkNo: "CK#1332" },
  { date: "2026-07-30", description: "Jeff's On Rugby — Chicken Tenders", amount: 320.0, checkNo: "CK#1333" },
  { date: "2026-07-30", description: "FNR#3", amount: 150.0, checkNo: null },
  { date: "2026-04-23", description: "Bank Checks", amount: 24.05, checkNo: null },
  { date: "2026-08-27", description: "Golfers Outlet", amount: 2404.5, checkNo: "CK#1335" },
  { date: "2026-08-27", description: "Cash for League Award Winners", amount: 1687.0, checkNo: "CK#1336" },
  { date: "2026-08-27", description: "Golfers Outlet — Titleist Putter", amount: 393.75, checkNo: "CK#1337" },
  { date: "2026-08-27", description: "Greene's Pour House — 39 Burgers", amount: 452.15, checkNo: "CK#1338" },
  { date: "2026-08-27", description: "6 — $50 Gift Cards", amount: 300.0, checkNo: "CK#1339" },
  { date: "2026-08-27", description: "Banquet Tickets", amount: 750.0, checkNo: null },
  { date: "2026-08-27", description: "Plaque Engraving", amount: 30.98, checkNo: "CK#1340" },
];

export const FIN_FIFTY_2026: FinFifty[] = [
  { date: "2026-04-23", amount: 95.0, winner: "Gary Clark $95" },
  { date: "2026-04-30", amount: 95.0, winner: "Jeff Steig $90" },
  { date: "2026-05-07", amount: 125.0, winner: "Mike & Al Lloyd $125" },
  { date: "2026-05-14", amount: 120.0, winner: "Mike & Al Lloyd $120" },
  { date: "2026-05-21", amount: 135.0, winner: "Jeff Steig $135" },
  { date: "2026-05-28", amount: 130.0, winner: "John Popp $130" },
  { date: "2026-06-04", amount: 135.0, winner: "John Murphy $135" },
  { date: "2026-06-11", amount: 100.0, winner: "Kevin Dewing & Ben Pitz $95" },
  { date: "2026-06-18", amount: 135.0, winner: "John Murphy $135" },
  { date: "2026-06-25", amount: 100.0, winner: "Al Lloyd $100" },
  { date: "2026-07-02", amount: 115.0, winner: "The Moose $115" },
  { date: "2026-07-09", amount: 110.0, winner: "Jerry & Peter Stueber $110" },
  { date: "2026-07-16", amount: 100.0, winner: "John Popp $100" },
  { date: "2026-07-23", amount: 115.0, winner: "Dave Schutz $115" },
  { date: "2026-07-30", amount: 140.0, winner: "Duane Bathke $140" },
  { date: "2026-08-06", amount: 130.0, winner: "Mike & Alan Lloyd $130" },
  { date: "2026-08-13", amount: 130.0, winner: "Mike & Justin Sobojinski" },
  { date: "2026-08-20", amount: 125.0, winner: "Phil Levine $125" },
];

export const FIN_OFFICERS_2026 = {
  treasurer: "Peter D. Stueber",
  verifier1: "Terry Schroeder",
  verifier2: "Troy Ehnert",
};
