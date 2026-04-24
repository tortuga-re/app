export function PageHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <header className={`mb-7 space-y-4 ${centered ? "text-center" : ""}`}>
      {eyebrow ? (
        <div className={`space-y-3 ${centered ? "flex flex-col items-center" : ""}`}>
          <p className="eyebrow">{eyebrow}</p>
          <div className="h-px w-16 bg-[linear-gradient(90deg,rgba(242,215,165,0),rgba(242,215,165,0.8),rgba(242,215,165,0))]" />
        </div>
      ) : null}

      <div className="space-y-2">
        <h1 className="hero-title text-[2.55rem] font-semibold leading-none text-white">
          {title}
        </h1>
        {description ? (
          <p
            className={`text-sm leading-7 text-[var(--text-muted)] ${
              centered ? "mx-auto max-w-md" : "max-w-sm"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
