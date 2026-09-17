import { redirect } from 'next/navigation';
import { firstPublishedEventId, SNAPSHOT_SOURCE } from '@/lib/meet';
import { decodeMeet, encodeMeet } from '@/lib/meet-url';

export const revalidate = 300;
export const maxDuration = 60;

export function generateStaticParams() {
  return [{ meet: encodeMeet(SNAPSHOT_SOURCE) }];
}

export default async function MeetIndex({ params }: { params: Promise<{ meet: string }> }) {
  const { meet: slug } = await params;
  const id = await firstPublishedEventId(decodeMeet(slug));
  redirect(`/m/${slug}/event/${id}`);
}
