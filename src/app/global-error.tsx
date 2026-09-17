'use client';

/** Last net: without this, an uncaught error is a blank "This page couldn't load" screen. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#071317', color: '#E4EFF1', margin: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px', display: 'grid', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Something broke on the way to this page</h1>
          <p style={{ margin: 0, color: '#92ADB6' }}>{error.message || 'No message came back with the error.'}</p>
          {error.digest && <code style={{ color: '#6B8994', fontSize: 13 }}>digest {error.digest}</code>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={reset}
              style={{ background: '#45C3CB', color: '#04181C', border: 0, borderRadius: 4, padding: '9px 14px', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
            >
              Try again
            </button>
            <a href="/" style={{ color: '#8FDDE2', alignSelf: 'center' }}>
              Open a meet
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
