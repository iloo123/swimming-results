'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface RecentMeet {
  slug: string;
  title: string;
  url: string;
  at: number;
}

const KEY = 'recent-meets';

export function readRecent(): RecentMeet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as RecentMeet[]) : [];
  } catch {
    return [];
  }
}

/** Records a visit so the home page can offer it again. */
export function RememberMeet({ slug, title, url }: { slug: string; title: string; url: string }) {
  useEffect(() => {
    const next = [{ slug, title, url, at: Date.now() }, ...readRecent().filter((m) => m.slug !== slug)].slice(0, 6);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode - not important enough to tell anyone about */
    }
  }, [slug, title, url]);
  return null;
}

export default function RecentMeets() {
  const [meets, setMeets] = useState<RecentMeet[]>([]);
  useEffect(() => setMeets(readRecent()), []);
  if (!meets.length) return null;
  return (
    <section className="examples">
      <h2>Meets you opened</h2>
      {meets.map((m) => (
        <Link className="example-card" key={m.slug} href={`/m/${m.slug}`}>
          <span className="t">{m.title}</span>
          <span className="u">{m.url}</span>
        </Link>
      ))}
    </section>
  );
}
