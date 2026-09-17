import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import { FilterProvider } from '@/components/Filters';
import { RememberMeet } from '@/components/RecentMeets';
import RefreshButton from '@/components/RefreshButton';
import { getAthletes, getEventSummaries, getMeet, getStats } from '@/lib/meet';
import { decodeMeet } from '@/lib/meet-url';

export const revalidate = 300;
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<{ meet: string }> }): Promise<Metadata> {
  try {
    const meet = await getMeet(decodeMeet((await params).meet));
    return { title: { default: meet.meet.title, template: `%s - ${meet.meet.title}` } };
  } catch {
    return { title: 'Meet not found' };
  }
}

export default async function MeetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ meet: string }>;
}) {
  const { meet: slug } = await params;
  let base: string;
  try {
    base = decodeMeet(slug);
  } catch {
    notFound();
  }

  const meet = await getMeet(base);
  const [events, stats, athletes] = await Promise.all([getEventSummaries(base), getStats(base), getAthletes(base)]);

  return (
    <>
      <div className="rope" />
      <header className="masthead">
        <div className="masthead-inner">
          <div>
            <p className="eyebrow">
              <Link href="/">Swim results</Link>
            </p>
            <h1>{meet.meet.title}</h1>
            <div className="meet-meta">
              <span>{meet.meet.dates.replace(/\s*-\s*/, ' – ')}</span>
              <span>{meet.sessions.length} sessions</span>
              <span>Unofficial times</span>
              <RefreshButton slug={slug} />
            </div>
          </div>
          <div className="stats">
            {(
              [
                [stats.events, 'Events'],
                [stats.swimmers, 'Swimmers'],
                [stats.teams, 'Schools'],
                [stats.results, 'Results'],
              ] as const
            ).map(([n, l]) => (
              <div key={l}>
                <div className="stat-n">{n}</div>
                <div className="stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="layout">
        <FilterProvider>
          <Sidebar
            slug={slug}
            events={events}
            sessions={meet.sessions}
            teams={meet.teams}
            swimmerCount={athletes.length}
          />
          <section className="panel">{children}</section>
        </FilterProvider>
      </main>

      <div className="footer">
        <p>
          Read live from{' '}
          <a href={meet.meet.source} target="_blank" rel="noopener">
            {meet.meet.source}
          </a>
          . Times are unofficial, exactly as the source states; rankings and medal counts on this site are computed from
          the published results. <Link href="/">Open a different meet</Link>.
        </p>
      </div>

      <RememberMeet slug={slug} title={meet.meet.title} url={meet.meet.source} />
    </>
  );
}
