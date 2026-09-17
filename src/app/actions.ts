'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { encodeMeet, normalizeMeetUrl } from '@/lib/meet-url';
import { resolveMeetBase, SNAPSHOT_SOURCE } from '@/lib/meet';

export interface OpenMeetState {
  error?: string;
}

/** Validates the pasted link by reading the meet's own index before sending anyone to it. */
export async function openMeet(_prev: OpenMeetState, formData: FormData): Promise<OpenMeetState> {
  let base: string;
  try {
    base = normalizeMeetUrl(String(formData.get('url') ?? ''));
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'That link did not work.' };
  }

  let resolved: string;
  try {
    resolved = await resolveMeetBase(base);
  } catch (err) {
    // The meet in the bundled snapshot stays readable even when its site will not answer.
    if (base !== SNAPSHOT_SOURCE) {
      const why = err instanceof Error ? err.message : String(err);
      return { error: `Could not read a meet at ${base} - ${why}` };
    }
    resolved = base;
  }

  redirect(`/m/${encodeMeet(resolved)}`);
}

/** Drops the cached copies of one meet's pages - the button to press while a meet is running. */
export async function refreshMeet(slug: string) {
  const { decodeMeet } = await import('@/lib/meet-url');
  const { forgetMeet } = await import('@/lib/meet');
  const base = decodeMeet(slug);
  forgetMeet(base);
  updateTag(base);
  revalidatePath(`/m/${slug}`, 'layout');
}
