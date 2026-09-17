import { ImageResponse } from 'next/og';
import { getAthlete, getMeet } from '@/lib/meet';
import { decodeMeet } from '@/lib/meet-url';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Swimmer results';

const INK = '#E4EFF1';
const MUTED = '#92ADB6';
const ACCENT = '#45C3CB';

export default async function Image({ params }: { params: Promise<{ meet: string; slug: string }> }) {
  const { meet: meetSlug, slug } = await params;
  const base = decodeMeet(meetSlug);
  const [athlete, meet] = await Promise.all([getAthlete(base, slug), getMeet(base)]);
  // Show what someone would actually brag about: medals first, then best placings.
  const best = (athlete?.swims ?? [])
    .filter((s) => s.place && !s.status)
    .sort((a, b) => (b.medal ? 4 - b.medal : 0) - (a.medal ? 4 - a.medal : 0) || a.place! - b.place!)
    .slice(0, 3);

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
        <div style={{ fontSize: 26, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' }}>
          {athlete?.team ?? 'Swimmer'}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 10 }}>{athlete?.name ?? 'Swimmer'}</div>

        <div style={{ display: 'flex', gap: 56, marginTop: 40 }}>
          {(
            [
              [String(athlete?.swims.length ?? 0), 'Swims'],
              [String(athlete?.relays.length ?? 0), 'Relay legs'],
              [(athlete?.medals ?? [0, 0, 0]).join(' / '), 'Gold / Silver / Bronze'],
            ] as const
          ).map(([v, k]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 44, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 22, color: MUTED, textTransform: 'uppercase', letterSpacing: 2 }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 38, gap: 12, fontSize: 30 }}>
          {best.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: 60, color: MUTED }}>{`${s.place}.`}</div>
              <div style={{ display: 'flex', flex: 1 }}>{`#${s.number} ${s.title}`}</div>
              <div style={{ display: 'flex', fontWeight: 700 }}>{s.result}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: MUTED }}>{meet.meet.title}</div>
      </div>
    ),
    size,
  );
}
