import Link from 'next/link';
import type { Metadata } from 'next';
import ShareButtons from '@/components/ShareButtons';
import { getMeet, getMedalTable, SNAPSHOT_SOURCE } from '@/lib/meet';
import { decodeMeet, encodeMeet } from '@/lib/meet-url';
import { medalText } from '@/lib/text';

export const revalidate = 300;
export const maxDuration = 60;

export function generateStaticParams() {
  return [{ meet: encodeMeet(SNAPSHOT_SOURCE) }];
}

export const metadata: Metadata = { title: 'Medal table' };

export default async function MedalsPage({ params }: { params: Promise<{ meet: string }> }) {
  const { meet: slug } = await params;
  const base = decodeMeet(slug);
  const [meet, rows] = await Promise.all([getMeet(base), getMedalTable(base)]);
  const finals = meet.events.filter((e) => e.round === 'Finals' && !e.empty).length;

  return (
    <>
      <div className="panel-head">
        <h2>Medal table</h2>
        <div className="actions">
          <ShareButtons title={`Medal table · ${meet.meet.title}`} shareLabel="Share table" copy={medalText(meet.meet.title, rows)} />
        </div>
        <p>First, second and third place in every published final - individual events and relays alike. Unofficial.</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="c-place" />
              <th>School</th>
              <th className="c-time">Gold</th>
              <th className="c-time">Silver</th>
              <th className="c-time">Bronze</th>
              <th className="c-time">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team}>
                <td className="c-place">
                  <span className={`place${i < 3 ? ` m${i + 1}` : ' none'}`}>{i + 1}</span>
                </td>
                <td>
                  <Link className="linkish" href={`/m/${slug}/swimmers?team=${encodeURIComponent(r.team)}`}>
                    {r.team}
                  </Link>
                </td>
                <td className="c-time">{r.gold || '—'}</td>
                <td className="c-time">{r.silver || '—'}</td>
                <td className="c-time">{r.bronze || '—'}</td>
                <td className="c-time result">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="result-count">
        {rows.length} schools on the board · {finals} finals counted
      </p>
    </>
  );
}
