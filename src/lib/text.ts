import type { MeetEvent } from './hytek';
import type { Athlete, MedalRow } from './meet';
import { swimmerName } from './meet';

/** Plain text for pasting into a chat - the way most people actually share a result. */
const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

export function eventText(meetTitle: string, ev: MeetEvent): string {
  const lines = [meetTitle, `Event ${ev.number}  ${ev.title}${ev.round ? ` - ${ev.round}` : ''}`, ''];
  for (const sec of ev.sections) {
    if (!sec.rows.length) continue;
    lines.push(`--- ${sec.name} ---`);
    for (const r of sec.rows) {
      const place = (r.place ? `${r.place}.` : '--').padStart(3);
      const who = ev.relay
        ? `${r.team}${r.squad ? ` '${r.squad}'` : ''}`
        : `${swimmerName(r)} (${r.age}) ${r.team}`;
      lines.push(`${place} ${pad(who, 40)} ${r.result}`);
      if (ev.relay && r.swimmers?.length) lines.push(`     ${r.swimmers.map((s) => s.name).join(', ')}`);
    }
    lines.push('');
  }
  lines.push(ev.url);
  return lines.join('\n');
}

export function athleteText(meetTitle: string, a: Athlete): string {
  const lines = [`${a.name} - ${a.team}`, meetTitle, ''];
  for (const s of a.swims)
    lines.push(`${(s.place ? `${s.place}.` : '--').padStart(3)} ${pad(`#${s.number} ${s.title} (${s.round})`, 56)} ${s.result}`);
  for (const s of a.relays)
    lines.push(`     ${pad(`#${s.number} ${s.title} - leg ${s.leg}`, 56)} ${s.result}`);
  return lines.join('\n');
}

export function medalText(meetTitle: string, rows: MedalRow[]): string {
  const lines = [`${meetTitle} - medal table (unofficial)`, ''];
  rows.forEach((r, i) =>
    lines.push(`${String(i + 1).padStart(2)}. ${pad(r.team, 20)} ${r.gold}G ${r.silver}S ${r.bronze}B  (${r.total})`),
  );
  return lines.join('\n');
}
