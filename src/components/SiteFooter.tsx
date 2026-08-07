import { LEAGUE } from "@/data/league";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-dusk-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-slate-200">{LEAGUE.name}</p>
            <p>
              {LEAGUE.course} · {LEAGUE.playDay}s · {LEAGUE.teeTimes}
            </p>
          </div>
          <div className="sm:text-right">
            <p>
              Contact: {LEAGUE.contact.name} ·{" "}
              <a
                href={`mailto:${LEAGUE.contact.email}`}
                className="text-sunset-300 hover:underline"
              >
                {LEAGUE.contact.email}
              </a>
            </p>
            <p>{LEAGUE.contact.phone}</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          {LEAGUE.season} season · For league members. Standings as of{" "}
          {LEAGUE.standingsAsOf}.
        </p>
      </div>
    </footer>
  );
}
