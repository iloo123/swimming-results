import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EventResults from '@/components/EventResults';
import ShareButtons from '@/components/ShareButtons';
import { getEvent, getEventSummaries, getMeet, getSlugLookup, SNAPSHOT_SOURCE } from '@/lib/meet';
import { decodeMeet, encodeMeet } from '@/lib/meet-url';
import { eventText } from '@/lib/text';
import { eventView } from '@/lib/view';

export const revalidate = 300;
export const maxDuration = 60;

type Params = { params: Promise<{ meet: string; id: string }> };

/**
 * The meet this app ships data for is rendered at build time, so its pages are static
 * files on the CDN - reachable even if the source site is not. Every other meet is
 * rendered on demand and cached from there.
 */
export async function generateStaticParams() {
  const meet = await getMeet(SNAPSHOT_SOURCE);
  const slug = encodeMeet(SNAPSHOT_SOURCE);
  return meet.events.map((e) => ({ meet: slug, id: e.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { meet: slug, id } = await params;
  try {
    const ev = await getEvent(decodeMeet(slug), id);
    if (!ev) return {};
    const podium = ev.sections[0]?.rows.slice(0, 3).map((r) => `${r.place}. ${r.fullName ?? r.name ?? r.team} ${r.result}`);
    return {
      title: `Event ${ev.number} ${ev.title}${ev.round ? ` - ${ev.round}` : ''}`,
      description: podium?.length ? podium.join(' · ') : ev.title,
    };
  } catch {
    return {};
  }
}

export default async function EventPage({ params }: Params) {
  const { meet: slug, id } = await params;
  const base = decodeMeet(slug);
  const [ev, meet, summaries, slugs] = await Promise.all([
    getEvent(base, id),
    getMeet(base),
    getEventSummaries(base),
    getSlugLookup(base),
  ]);
  if (!ev) notFound();

  const session = meet.sessions.find((s) => s.number === ev.session);
  const i = summaries.findIndex((e) => e.id === ev.id);
  const prev = i > 0 ? summaries[i - 1] : null;
  const next = i >= 0 && i < summaries.length - 1 ? summaries[i + 1] : null;

  return (
    <>
      <div className="event-head">
        <p className="event-num">Event {ev.number}</p>
        <h2 className="event-title">{ev.title}</h2>
        <div className="tags">
          {ev.round && <span className="tag solid">{ev.round}</span>}
          {[ev.category, ev.gender, ev.distance ? `${ev.distance}m` : '', ev.stroke].filter(Boolean).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
          {session && (
            <span className="tag">
              {session.name} · {session.weekday} {session.date}
            </span>
          )}
        </div>
        <div className="actions">
          <ShareButtons
            title={`Event ${ev.number} - ${ev.title} · ${meet.meet.title}`}
            shareLabel="Share event"
            copy={ev.empty ? undefined : eventText(meet.meet.title, ev)}
          />
          <a className="btn ghost" href={ev.url} target="_blank" rel="noopener">
            Original page
          </a>
          <div className="nav-pair">
            {prev ? (
              <Link className="btn" href={`/m/${slug}/event/${prev.id}`}>
                ‹ Prev
              </Link>
            ) : (
              <span className="btn" aria-disabled="true">
                ‹ Prev
              </span>
            )}
            {next ? (
              <Link className="btn" href={`/m/${slug}/event/${next.id}`}>
                Next ›
              </Link>
            ) : (
              <span className="btn" aria-disabled="true">
                Next ›
              </span>
            )}
          </div>
        </div>
      </div>

      {ev.empty ? (
        <p className="empty-note">
          No results have been published for this event yet. Pick another event, or open the original page to check
          again.
        </p>
      ) : (
        <EventResults
          slug={slug}
          sections={eventView(ev, slugs)}
          columns={ev.columns}
          relay={ev.relay}
          stamp={ev.stamp}
        />
      )}
    </>
  );
}
