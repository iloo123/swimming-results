'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ICONS: Record<string, string> = {
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m0 0L8 7m4-4 4 4',
  copy: 'M9 9h10v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM15 6V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1',
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function ShareButtons({ title, shareLabel = 'Share', copy }: { title: string; shareLabel?: string; copy?: string }) {
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const write = useCallback(
    async (text: string, msg: string) => {
      try {
        await navigator.clipboard.writeText(text);
        flash(msg);
      } catch {
        flash('Copy failed - select the text manually');
      }
    },
    [flash],
  );

  const share = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    void write(`${title}\n${url}`, 'Link copied');
  }, [title, write]);

  return (
    <>
      <button className="btn primary" type="button" onClick={share}>
        <Icon name="share" />
        <span>{shareLabel}</span>
      </button>
      {copy && (
        <button className="btn" type="button" onClick={() => void write(copy, 'Results copied')}>
          <Icon name="copy" />
          <span>Copy results</span>
        </button>
      )}
      <div className={`toast${toast ? ' show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}
