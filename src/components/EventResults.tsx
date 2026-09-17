'use client';

import Link from 'next/link';
import { useFilters } from './Filters';
import type { ViewRow, ViewSection } from '@/lib/view';

const STATUS = /^(DQ|NS|DFS|SCR|NT)$/;

export default function EventResults({
  slug,
  sections,
  columns,
  relay,
  stamp,
}: {
  slug: string;
  sections: ViewSection[];
  columns: string[];
  relay: boolean;
  stamp: string;
}) {
  const { filters } = useFilters();
  const q = filters.q.toLowerCase().trim();

  const matches = (row: ViewRow) => {
    if (filters.team && row.team !== filters.team) return false;
    if (!q) return true;
    const hay = [row.name, row.team, ...(row.legs ?? []).map((l) => l.name)].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  };

  const visible = sections.map((sec) => ({ ...sec, rows: sec.rows.filter(matches) })).filter((sec) => sec.rows.length);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  const shown = visible.reduce((n, s) => n + s.rows.length, 0);
  const timeCols = columns.length ? columns : ['Time'];

  return (
    <>
      {visible.map((sec) => (
        <div key={sec.name}>
          <div className="section-head">
            <span>{sec.name}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="c-place" />
                  {relay ? <th>Team</th> : <th>Name</th>}
                  {!relay && <th className="c-age">Age</th>}
                  {!relay && <th className="c-team">Team</th>}
                  {timeCols.map((c) => (
                    <th className="c-time" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row, i) => (
                  <tr key={`${row.team}-${row.name ?? row.squad ?? i}-${i}`} className={row.cut ? 'cut' : undefined}>
                    <td className="c-place">
                      <span className={`place${row.medal ? ` m${row.medal}` : row.place ? '' : ' none'}`}>
                        {row.place ?? '—'}
                      </span>
                    </td>
                    {relay ? (
                      <td>
                        <div>
                          {row.team}
                          {row.squad && <span className="squad">&lsquo;{row.squad}&rsquo;</span>}
                        </div>
                        {row.legs?.length ? (
                          <div className="legs">
                            {row.legs.map((l) => (
                              <span key={l.leg}>
                                <b>{l.leg})</b>
                                {l.slug ? (
                                  <Link className="swimmer" href={`/m/${slug}/swimmer/${l.slug}`}>
                                    {l.name}
                                  </Link>
                                ) : (
                                  l.name
                                )}
                                {l.age && ` ${l.age}`}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    ) : (
                      <>
                        <td>
                          {row.slug ? (
                            <Link className="swimmer" href={`/m/${slug}/swimmer/${row.slug}`}>
                              {row.name}
                            </Link>
                          ) : (
                            row.name
                          )}
                        </td>
                        <td className="c-age">{row.age}</td>
                        <td className="c-team">{row.team}</td>
                      </>
                    )}
                    {row.values.map((v, ci) => (
                      <td className={`c-time ${ci === row.resultIndex ? 'result' : 'seed'}`} key={ci}>
                        {STATUS.test(v) ? (
                          <span className={`status ${v === 'DQ' ? 'dq' : 'ns'}`}>{v}</span>
                        ) : (
                          v || (row.resultIndex < 0 && ci === row.values.length - 1 ? '—' : '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!shown && (
        <p className="empty-note">
          Nothing in this event matches {q ? `“${filters.q}”` : 'that filter'}.
        </p>
      )}
      <p className="result-count">
        {shown === total
          ? `${total} ${relay ? 'teams' : 'swimmers'}${stamp ? ` · results as of ${stamp}` : ''}`
          : `${shown} of ${total} shown`}
      </p>
    </>
  );
}
