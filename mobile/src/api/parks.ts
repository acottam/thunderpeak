import { apiFetch } from '@/api/client';
import type { Designation, Park } from '@/types/park';

// The last list we loaded, so opening a park from the catalogue is instant.
let cachedParks: Park[] | null = null;

export async function fetchParks(): Promise<Park[]> {
  const parks = await apiFetch<Park[]>('/parks');
  cachedParks = parks;
  return parks;
}

export function getCachedPark(id: number): Park | undefined {
  return cachedParks?.find((p) => p.id === id);
}

export function fetchPark(id: number): Promise<Park> {
  return apiFetch<Park>(`/parks/${id}`);
}

// Uses the API's `designation` when it exists, otherwise reads it from the name
// ("Denali National Park & Preserve", "Muir Woods National Monument").
export function designationOf(park: Park): Designation | null {
  const source = `${park.designation ?? ''} ${park.name}`;
  if (/National Monument/i.test(source)) return 'National Monument';
  if (/National Parks?\b/i.test(source)) return 'National Park';
  return null;
}

// Points for an eligible check-in. Null until the import fills `point_value`.
export function pointsFor(park: Park): number | null {
  return typeof park.point_value === 'number' ? park.point_value : null;
}

// "Denali National Park & Preserve" -> "Denali", for the header title.
export function shortName(park: Park): string {
  return park.name.replace(/\s+National (Park|Parks|Monument)\b.*$/i, '') || park.name;
}

export function formatStates(location: string | null): string {
  return location ? location.split(',').map((s) => s.trim()).join(' · ') : 'Location unknown';
}

// Placeholder banner color until NPS photos (`image_url`) arrive.
const BANNER_COLORS = ['#B5651D', '#C0392B', '#2E7D5B', '#D35400', '#34495E', '#7D5A50', '#1E5631', '#8E6C3A'];
export function bannerColor(park: Park): string {
  return BANNER_COLORS[park.id % BANNER_COLORS.length];
}
