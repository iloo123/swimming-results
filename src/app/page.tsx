import Link from 'next/link';
import MeetForm from '@/components/MeetForm';
import RecentMeets from '@/components/RecentMeets';
import { SNAPSHOT_MEET } from '@/lib/meet';
import { encodeMeet } from '@/lib/meet-url';

export default function Home() {
  return (
    <>
      <div className="rope" />
      <div className="home">
        <div>
          <p className="eyebrow">HY-TEK Real Time Results</p>
          <h1>Open a swim meet, read it properly.</h1>
        </div>
        <p className="lede">
          Paste the link to a meet - the frameset of fixed-width pages a timing system publishes - and this reads every
          event: a picker instead of a scrolling index, filters, a page per swimmer, a medal table, and a link you can
          send to someone.
        </p>

        <MeetForm />

        <RecentMeets />

        <section className="examples">
          <h2>Try this one</h2>
          <Link className="example-card" href={`/m/${encodeMeet(SNAPSHOT_MEET.source)}`}>
            <span className="t">{SNAPSHOT_MEET.title}</span>
            <span className="u">{SNAPSHOT_MEET.source}</span>
          </Link>
        </section>

        <section className="steps">
          <h2>How it works</h2>
          <ol>
            <li>The meet index is read for its sessions and events.</li>
            <li>Every event page is parsed by column position - that is how a seed time is told from a prelim.</li>
            <li>Pages are cached and re-read every few minutes, so a live meet keeps updating.</li>
          </ol>
        </section>
      </div>
    </>
  );
}
