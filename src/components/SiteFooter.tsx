import { LEAGUE } from "@/data/league";
import { getSeasonMeta } from "@/lib/queries";

export async function SiteFooter() {
  const meta = await getSeasonMeta();
  return (
    <footer className="border-t border-line bg-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 text-sm text-ink2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">{LEAGUE.name}</p>
            <p>
              {LEAGUE.course} · {LEAGUE.playDay}s · {LEAGUE.teeTimes}
            </p>
          </div>
          <div className="sm:text-right">
            <p>
              Contact: {LEAGUE.contact.name} ·{" "}
              <a
                href={`mailto:${LEAGUE.contact.email}`}
                className="text-accent hover:underline"
              >
                {LEAGUE.contact.email}
              </a>
            </p>
            <p>{LEAGUE.contact.phone}</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-ink3">
          {LEAGUE.season} season · For league members.{" "}
          {meta.complete
            ? `Final ${LEAGUE.season} standings · season complete ${meta.asOf}.`
            : `Standings as of ${meta.asOf}.`}
        </p>
      </div>
    </footer>
  );
}
