export default function AdminPlaceholder() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--ink)',
        color: 'var(--bone)',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div>
        <p className="eyebrow">Admin</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', margin: '0.5rem 0' }}>
          Dashboard not wired up yet
        </h1>
        <p style={{ color: 'var(--bone-dim)', maxWidth: '40ch', margin: '0 auto' }}>
          This route will host Meckury AI admin login and the IQ Ads
          portfolio manager once the shared database schema and RLS
          policies are in place.
        </p>
      </div>
    </div>
  );
}
