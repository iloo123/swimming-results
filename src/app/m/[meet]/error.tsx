'use client';

import Link from 'next/link';

export default function MeetError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-panel">
      <h1>That meet could not be read</h1>
      <p>
        The site it lives on did not answer, or the pages are not in the HY-TEK format this reads.
      </p>
      <code>{error.message}</code>
      <div className="actions">
        <button className="btn primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="btn" href="/">
          Open a different meet
        </Link>
      </div>
    </div>
  );
}
