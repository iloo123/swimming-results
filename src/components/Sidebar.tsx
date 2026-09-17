'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useFilters } from './Filters';
import type { EventSummary } from '@/lib/meet';
import type { Session } from '@/lib/hytek';

const label = (e: EventSummary) => `#${e.number} ${e.title}${e.round ? ` - ${e.round}` : ''}${e.empty ? ' (no results)' : ''}`;

export default function Sidebar({
  slug,
  events,
  sessions,
  teams,
  swimmerCount,
}: {
  slug: string;
  events: EventSummary[];
  sessions: Session[];
  teams: string[];
  swimmerCount: number;
}) {
  const router = useRouter();
  const path = usePathname();
  const { filters, set, reset } = useFilters();
  const [lastEvent, setLastEvent] = useState(events.find((e) => !e.empty)?.id ?? events[0]?.id ?? '');

  const currentEvent = path.match(/\/event\/([^/]+)/)?.[1] ?? '';
  useEffect(() => {
    if (currentEvent) setLastEvent(currentEvent);
  }, [currentEvent]);

  const matching = useMemo(
    () =>
      events.filter(
        (e) =>
          (!filters.round || e.round === filters.round) &&
          (!filters.category || e.category === filters.category) &&
          (!filters.gender || e.gender === filters.gender) &&
          (!filters.stroke || e.stroke === filters.stroke),
      ),
    [events, filters.round, filters.category, filters.gender, filters.stroke],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, EventSummary[]>();
    for (const e of matching) (map.get(e.session) ?? map.set(e.session, []).get(e.session)!).push(e);
    return [...map].sort((a, b) => a[0] - b[0]);
  }, [matching]);

  const options = (key: keyof EventSummary) => [...new Set(events.map((e) => String(e[key])).filter(Boolean))];
  const section = path.includes('/swimmer') ? 'swimmers' : path.includes('/medals') ? 'medals' : 'events';

  return (
    <aside className="sidebar">
      <nav className="nav">
        <Link href={`/m/${slug}/event/${currentEvent || lastEvent}`} aria-current={section === 'events' ? 'page' : undefined}>
          Events
        </Link>
        <Link href={`/m/${slug}/swimmers`} aria-current={section === 'swimmers' ? 'page' : undefined}>
          Swimmers
        </Link>
        <Link href={`/m/${slug}/medals`} aria-current={section === 'medals' ? 'page' : undefined}>
          Medals
        </Link>
      </nav>

      <div className="panel controls">
        <div className="field">
          <label htmlFor="eventSelect">Event</label>
          <select
            id="eventSelect"
            value={currentEvent || lastEvent}
            disabled={!matching.length}
            onChange={(e) => router.push(`/m/${slug}/event/${e.target.value}`)}
          >
            {grouped.map(([number, evs]) => {
              const s = sessions.find((x) => x.number === number);
              return (
                <optgroup
                  key={number}
                  label={`${s?.name ?? `Session ${number}`} - ${[s?.weekday, s?.date, s?.time && `· ${s.time}`].filter(Boolean).join(' ')}`}
                >
                  {evs.map((e) => (
                    <option key={e.id} value={e.id}>
                      {label(e)}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {!matching.length && <option value="">No events match these filters</option>}
          </select>
          <p className="hint">
            {matching.length} of {events.length} events · {sessions.length} sessions
          </p>
        </div>

        <div className="grid-2">
          <Select id="fRound" label="Round" value={filters.round} onChange={(v) => set({ round: v })} all="All rounds" options={['Prelims', 'Finals']} />
          <Select id="fCategory" label="Category" value={filters.category} onChange={(v) => set({ category: v })} all="All categories" options={options('category')} />
          <Select id="fGender" label="Gender" value={filters.gender} onChange={(v) => set({ gender: v })} all="All" options={options('gender')} />
          <Select id="fStroke" label="Stroke" value={filters.stroke} onChange={(v) => set({ stroke: v })} all="All strokes" options={options('stroke')} />
        </div>

        <Select id="fTeam" label="School / team" value={filters.team} onChange={(v) => set({ team: v })} all="All schools" options={teams} />

        <div className="field">
          <label htmlFor="fQuery">Find a swimmer</label>
          <input
            id="fQuery"
            type="search"
            placeholder="Name..."
            autoComplete="off"
            spellCheck={false}
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <p className="hint">
            {filters.q ? (
              <Link className="linkish" href={`/m/${slug}/swimmers`}>
                Search all {swimmerCount} swimmers
              </Link>
            ) : (
              'Filters the current event; open Swimmers for a full list.'
            )}
          </p>
        </div>

        <button className="reset" type="button" onClick={reset}>
          Clear all filters
        </button>
      </div>
    </aside>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  all,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: string[];
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
