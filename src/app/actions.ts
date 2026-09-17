'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { encodeMeet, normalizeMeetUrl } from '@/lib/meet-url';
import { probeMeet } from '@/lib/meet';

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

  try {
    await probeMeet(base);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return { error: `No meet found at ${base} (${why}). Use the link to any page of the meet, e.g. .../index.htm` };
  }

  redirect(`/m/${encodeMeet(base)}`);
}

/** Drops the cached copies of one meet's pages - the button to press while a meet is running. */
export async function refreshMeet(slug: string) {
  const { decodeMeet } = await import('@/lib/meet-url');
  updateTag(decodeMeet(slug));
  revalidatePath(`/m/${slug}`, 'layout');
}
