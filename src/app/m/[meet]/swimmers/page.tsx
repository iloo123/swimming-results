import type { Metadata } from 'next';
import SwimmerList from '@/components/SwimmerList';
import { getAthletes } from '@/lib/meet';
import { decodeMeet } from '@/lib/meet-url';

export const revalidate = 300;

export const metadata: Metadata = { title: 'Swimmers' };

export default async function SwimmersPage({
  params,
  searchParams,
}: {
  params: Promise<{ meet: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ meet: slug }, { team }] = await Promise.all([params, searchParams]);
  const athletes = await getAthletes(decodeMeet(slug));
  const swimmers = athletes.map((a) => ({
    slug: a.slug,
    name: a.name,
    team: a.team,
    entries: a.swims.length + a.relays.length,
    medals: a.medals,
  }));

  return <SwimmerList slug={slug} swimmers={swimmers} initialTeam={team ?? ''} />;
}
