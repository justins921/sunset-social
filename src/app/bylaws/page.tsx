import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { BYLAWS, BYLAWS_AS_OF } from "@/data/rules";
import { LEAGUE } from "@/data/league";

export const metadata: Metadata = { title: "Bylaws" };

export default function BylawsPage() {
  return (
    <div>
      <PageHeader
        eyebrow={`As of ${BYLAWS_AS_OF}`}
        title="Bylaws"
        subtitle="How the league is governed — officers, meetings, quorum, dues, and the treasury."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ol className="space-y-4">
          {BYLAWS.map((b, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-2xl border border-white/10 bg-dusk-800/40 p-5"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunset-500/20 font-mono text-sm text-sunset-200">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-300">{b}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-sunset-500/30 bg-sunset-500/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sunset-200">
            Dues at a glance
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
            <li>• $50.00 annual membership fee, due by the second league night.</li>
            <li>• $5.00 per golfer goes to the Secretary/Treasurer as salary.</li>
            <li>• The Secretary/Treasurer is exempt from the membership fee.</li>
            <li>• Officers are elected on the night of the banquet.</li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Questions about governance? Contact {LEAGUE.contact.name} at{" "}
            <a
              href={`mailto:${LEAGUE.contact.email}`}
              className="text-sunset-300 hover:underline"
            >
              {LEAGUE.contact.email}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
