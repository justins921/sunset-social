import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RULES, RULES_AS_OF } from "@/data/rules";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  return (
    <div>
      <PageHeader
        eyebrow={`As of ${RULES_AS_OF}`}
        title="League rules"
        subtitle="Nine-hole match play under the 10-point system. USGA rules apply with the league exceptions below. Remember — this is a fun league."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="space-y-5">
          {RULES.map((r) => (
            <section
              key={r.n}
              id={`rule-${r.n}`}
              className="scroll-mt-20 rounded-2xl border border-line bg-surface/40 p-5"
            >
              <h2 className="flex items-baseline gap-3 text-lg font-semibold">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunset-500/20 font-mono text-sm text-accent">
                  {r.n}
                </span>
                {r.title}
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink2">
                {r.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
