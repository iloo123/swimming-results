import Link from 'next/link';
import RefreshButton from './RefreshButton';

/**
 * Rendered in place of the meet when the source site will not answer. A layout that
 * throws blows past its own error boundary, so failure has to be a render, not a throw.
 */
export default function MeetUnavailable({ slug, base, tried }: { slug: string; base: string; tried: string[] }) {
  return (
    <>
      <div className="rope" />
      <div className="error-panel">
        <p className="eyebrow">
          <Link href="/">Swim results</Link>
        </p>
        <h1>That meet did not answer</h1>
        <p className="lede">
          The results site is reachable from a browser but not from this server, or it is down right now. Nothing here
          is cached for it yet, so there is nothing to show.
        </p>
        <p>
          Source: <code>{base}</code>
        </p>
        <ul className="hint" style={{ margin: 0, paddingLeft: 18 }}>
          {tried.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
        <div className="actions">
          <RefreshButton slug={slug} label="Try again" className="btn primary" />
          <a className="btn" href={base} target="_blank" rel="noopener">
            Open the original site
          </a>
          <Link className="btn ghost" href="/">
            Open a different meet
          </Link>
        </div>
      </div>
    </>
  );
}
