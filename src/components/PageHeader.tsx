export function PageHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="border-b border-line bg-gradient-to-b from-surface2 to-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-ink2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
