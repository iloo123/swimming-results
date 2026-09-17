import type { MeetEvent, ResultRow, Section } from './hytek';
import { FINAL_RE, athleteKey, swimmerName } from './meet';

/** What a result row looks like once the server has resolved names, slugs and medals. */
export interface ViewRow {
  place: number | null;
  medal: number;
  name?: string;
  slug?: string;
  age?: string;
  team: string;
  squad?: string;
  legs?: { leg: number; name: string; slug?: string; age: string }[];
  values: string[];
  resultIndex: number;
  cut: boolean;
}

export interface ViewSection {
  name: string;
  rows: ViewRow[];
}

export function eventView(ev: MeetEvent, slugs: Record<string, string>): ViewSection[] {
  const medal = (row: ResultRow, sec: Section) =>
    ev.round === 'Finals' && FINAL_RE.test(sec.name) && row.place && row.place <= 3 && !row.status ? row.place : 0;

  return ev.sections.map((sec) => ({
    name: sec.name,
    rows: sec.rows.map((row) => {
      const values = ev.columns.map((c) => row.times.find((t) => t.label === c)?.value ?? '');
      const name = swimmerName(row);
      return {
        place: row.place,
        medal: medal(row, sec),
        ...(ev.relay
          ? {
              legs: (row.swimmers ?? []).map((l) => ({ ...l, slug: slugs[athleteKey(l.name, row.team)] })),
            }
          : { name, slug: slugs[athleteKey(name, row.team)], age: row.age }),
        team: row.team,
        squad: row.squad,
        values,
        resultIndex: values.reduce((acc, v, i) => (v ? i : acc), -1),
        cut: Boolean(row.cut),
      };
    }),
  }));
}
