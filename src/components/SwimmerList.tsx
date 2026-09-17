'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFilters } from './Filters';

export interface SwimmerCard {
  slug: string;
  name: string;
  team: string;
  entries: number;
  medals: [number, number, number];
}

export default function SwimmerList({
  slug,
  swimmers,
  initialTeam = '',
}: {
  slug: string;
  swimmers: SwimmerCard[];
  initialTeam?: string;
}) {
  const { filters, set } = useFilters();
  const [seeded, setSeeded] = useState(false);

  // Arriving from the medal table ("show me this school") seeds the sidebar's school filter.
  // Until that lands, filter by the URL's team so the server and first paint already agree.
  useEffect(() => {
    if (initialTeam) set({ team: initialTeam });
    setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTeam]);

  const team = seeded ? filters.team : initialTeam || filters.team;
  const q = filters.q.toLowerCase().trim();
  const list = swimmers.filter((s) => (!team || s.team === team) && (!q || s.name.toLowerCase().includes(q)));

  return (
    <>
      <div className="panel-head">
        <h2>{q || team ? 'Matching swimmers' : 'All swimmers'}</h2>
        <p>
          {list.length} of {swimmers.length}
          {team ? ` · ${team}` : ''} · type a name in the sidebar to narrow
        </p>
      </div>
      <div className="list">
        {list.map((s) => (
          <Link key={s.slug} href={`/m/${slug}/swimmer/${s.slug}`}>
            <span className="nm">{s.name}</span>
            <span className="c-team">{s.team}</span>
            <span className="mt">
              {s.medals[0] ? `${s.medals[0]}G ` : ''}
              {s.medals[1] ? `${s.medals[1]}S ` : ''}
              {s.medals[2] ? `${s.medals[2]}B ` : ''}
              {s.entries} {s.entries === 1 ? 'entry' : 'entries'}
            </span>
          </Link>
        ))}
      </div>
      {!list.length && <p className="empty-note">No swimmer matches that name.</p>}
    </>
  );
}
