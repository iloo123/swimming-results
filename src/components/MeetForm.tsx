'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { openMeet, type OpenMeetState } from '@/app/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" type="submit" disabled={pending}>
      {pending ? 'Reading meet...' : 'Open results'}
    </button>
  );
}

export default function MeetForm({ defaultValue = '' }: { defaultValue?: string }) {
  const [state, action] = useActionState<OpenMeetState, FormData>(openMeet, {});
  return (
    <form className="meet-form" action={action}>
      <label className="hint" htmlFor="url">
        Meet results link
      </label>
      <div className="row">
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://results.mv/2026/22rjsc/index.htm"
          defaultValue={defaultValue}
        />
        <Submit />
      </div>
      {state.error ? (
        <p className="err" role="alert">
          {state.error}
        </p>
      ) : (
        <p className="hint">Any page of the meet works - index.htm, evtindex.htm, or the folder itself.</p>
      )}
    </form>
  );
}
