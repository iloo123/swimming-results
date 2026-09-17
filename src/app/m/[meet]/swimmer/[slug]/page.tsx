import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ShareButtons from '@/components/ShareButtons';
import { getAthlete, getMeet, type AthleteSwim } from '@/lib/meet';
import { decodeMeet } from '@/lib/meet-url';
import { athleteText } from '@/lib/text';

export const revalidate = 300;
export const maxDuration = 60;

type Params = { params: Promise<{ meet: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { meet, slug } = await params;
  try {
    const a = await getAthlete(decodeMeet(meet), slug);
    if (!a) return {};
    const [g, s, b] = a.medals;
    return {
      title: a.name,
      description: `${a.team} · ${a.swims.length} swims, ${a.relays.length} relay legs${g + s + b ? ` · ${g} gold, ${s} silver, ${b} bronze` : ''}`,
    };
  } catch {
    return {};
  }
}

function Place({ swim }: { swim: AthleteSwim }) {
  return (
    <span className={`place${swim.medal ? ` m${swim.medal}` : swim.place ? '' : ' none'}`}>{swim.place ?? '—'}</span>
  );
}

export default async function SwimmerPage({ params }: Params) {
  const { meet: meetSlug, slug } = await params;
  const base = decodeMeet(meetSlug);
  const [athlete, meet] = await Promise.all([getAthlete(base, slug), getMeet(base)]);
  if (!athlete) notFound();

  const sessionLabel = (s: AthleteSwim) => {
    const session = meet.sessions.find((x) => x.number === s.session);
    return session ? `${session.name} · ${session.date}` : '';
  };
  const finals = athlete.swims.filter((s) => s.round === 'Finals' && /final/i.test(s.section) && s.place && !s.status);

  return (
    <>
      <div className="athlete-head">
        <Link className="linkish" href={`/m/${meetSlug}/swimmers`}>
          ← All swimmers
        </Link>
        <h2>{athlete.name}</h2>
        <div className="tags">
          <span className="tag solid">{athlete.team}</span>
          {athlete.ages.length > 0 && <span className="tag">Age {athlete.ages.join('/')}</span>}
        </div>
        <div className="actions">
          <ShareButtons
            title={`${athlete.name} - ${athlete.team} · ${meet.meet.title}`}
            shareLabel="Share swimmer"
            copy={athleteText(meet.meet.title, athlete)}
          />
        </div>
      </div>

      <div className="pb">
        {(
          [
            [athlete.swims.length, 'Individual swims'],
            [athlete.relays.length, 'Relay legs'],
            [finals.length, 'Finals'],
            [athlete.medals.join(' / '), 'Gold / Silver / Bronze'],
          ] as const
        ).map(([v, k]) => (
          <div key={k}>
            <span className="v">{v}</span>
            <span className="k">{k}</span>
          </div>
        ))}
      </div>

      <div className="section-head">
        <span>Individual results</span>
      </div>
      {athlete.swims.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="c-place" />
                <th>Event</th>
                <th className="c-team">Round</th>
                <th className="c-team">Session</th>
                <th className="c-time">Time</th>
              </tr>
            </thead>
            <tbody>
              {athlete.swims.map((s, i) => (
                <tr key={`${s.eventId}-${i}`}>
                  <td className="c-place">
                    <Place swim={s} />
                  </td>
                  <td>
                    <Link className="linkish" href={`/m/${meetSlug}/event/${s.eventId}`}>
                      #{s.number} {s.title}
                    </Link>
                  </td>
                  <td className="c-team">{s.round || '—'}</td>
                  <td className="c-team">{sessionLabel(s)}</td>
                  <td className="c-time result">
                    {s.status ? <span className={`status ${s.status === 'DQ' ? 'dq' : 'ns'}`}>{s.status}</span> : s.result || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-note">No individual swims - this swimmer appears in relays only.</p>
      )}

      {athlete.relays.length > 0 && (
        <>
          <div className="section-head">
            <span>Relays</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="c-place" />
                  <th>Event</th>
                  <th className="c-age">Leg</th>
                  <th className="c-team">Team</th>
                  <th className="c-time">Time</th>
                </tr>
              </thead>
              <tbody>
                {athlete.relays.map((s, i) => (
                  <tr key={`${s.eventId}-relay-${i}`}>
                    <td className="c-place">
                      <Place swim={s} />
                    </td>
                    <td>
                      <Link className="linkish" href={`/m/${meetSlug}/event/${s.eventId}`}>
                        #{s.number} {s.title}
                      </Link>
                    </td>
                    <td className="c-age">{s.leg}</td>
                    <td className="c-team">
                      {s.team ?? athlete.team}
                      {s.squad && <span className="squad">&lsquo;{s.squad}&rsquo;</span>}
                    </td>
                    <td className="c-time result">{s.result || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
