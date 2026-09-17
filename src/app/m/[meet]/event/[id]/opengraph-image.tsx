import { ImageResponse } from 'next/og';
import { getEvent, getMeet, swimmerName } from '@/lib/meet';
import { decodeMeet } from '@/lib/meet-url';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Event results';

const INK = '#E4EFF1';
const MUTED = '#92ADB6';
const ACCENT = '#45C3CB';
const MEDAL = ['#E2B855', '#B4C1C8', '#D08D51'];

/** The card someone sees when a result link lands in a chat. */
export default async function Image({ params }: { params: Promise<{ meet: string; id: string }> }) {
  const { meet: slug, id } = await params;
  const base = decodeMeet(slug);
  const [ev, meet] = await Promise.all([getEvent(base, id), getMeet(base)]);

  const podium = (ev?.sections[0]?.rows ?? [])
    .filter((r) => r.place && r.place <= 3)
    .map((r) => ({
      place: r.place!,
      who: ev?.relay ? `${r.team}${r.squad ? ` '${r.squad}'` : ''}` : swimmerName(r),
      sub: ev?.relay ? '' : r.team,
      time: r.result,
    }));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#071317',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          color: INK,
        }}
      >
        <div style={{ display: 'flex', height: 10, marginBottom: 40 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ width: 36, height: 10, background: i % 3 === 2 ? 'transparent' : ACCENT, marginRight: 8 }} />
          ))}
        </div>
        <div style={{ fontSize: 26, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' }}>
          {`Event ${ev?.number ?? ''}${ev?.round ? ` \u00B7 ${ev.round}` : ''}`}
        </div>
        <div style={{ fontSize: 58, fontWeight: 700, marginTop: 12, lineHeight: 1.1, maxWidth: 1000 }}>
          {ev?.title ?? 'Results'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34, gap: 14 }}>
          {podium.map((p) => (
            <div key={p.place} style={{ display: 'flex', alignItems: 'center', fontSize: 34 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 8,
                  background: MEDAL[p.place - 1],
                  color: '#071317',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  marginRight: 22,
                }}
              >
                {p.place}
              </div>
              <div style={{ display: 'flex', flex: 1 }}>{p.who}</div>
              {p.sub ? <div style={{ display: 'flex', color: MUTED, marginRight: 28 }}>{p.sub}</div> : null}
              <div style={{ display: 'flex', fontWeight: 700 }}>{p.time}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: MUTED }}>{meet.meet.title}</div>
      </div>
    ),
    size,
  );
}
