export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b className={tone}>{value}</b>
    </div>
  );
}

/** Tampilan sementara selama data halaman dimuat. */
export function Loading({ title }: { title: string }) {
  return (
    <>
      <header className="top">
        <h1>{title}</h1>
      </header>
      <main aria-busy="true">
        <section className="card">
          <p className="muted">Memuat…</p>
        </section>
      </main>
    </>
  );
}

export function Bar({ percent }: { percent: number }) {
  return (
    <div className="bar" role="presentation">
      <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
