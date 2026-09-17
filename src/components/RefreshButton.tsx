'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshMeet } from '@/app/actions';

/** Results change while a meet is running; this drops the cache without a hard reload. */
export default function RefreshButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="reset"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshMeet(slug);
          router.refresh();
        })
      }
    >
      {pending ? 'Refreshing...' : 'Refresh now'}
    </button>
  );
}
