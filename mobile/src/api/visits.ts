import type { AuthFetch } from '@/auth/AuthContext';

// Shapes from docs/api.md, "Visits". Dates are YYYY-MM-DD strings.

export type CheckIn = {
  id: number;
  park_id: number;
  park_name: string;
  visited_date: string;
  points_awarded: number;
  next_eligible_date: string | null;
};

export type Visit = {
  id: number;
  park_id: number;
  park_name: string;
  visited_date: string;
  points_awarded: number;
};

export type ParkStatus = {
  park_id: number;
  visit_count: number;
  last_visited_date: string | null;
  last_awarded_date: string | null;
  next_eligible_date: string | null;
  can_earn_points_now: boolean;
};

export type Score = {
  total_points: number;
  visit_count: number;
  // Sprint 3 adds this; optional until it is live.
  breakdown?: { parks: number; hikes: number; activities: number; wildlife: number };
};

// No visited_date: the server uses today. Sending the phone's date could be
// "in the future" for the server when the phone is in a later time zone.
export function checkIn(authFetch: AuthFetch, parkId: number): Promise<CheckIn> {
  return authFetch<CheckIn>('/visits', { method: 'POST', body: { park_id: parkId } });
}

export function fetchParkStatus(authFetch: AuthFetch, parkId: number): Promise<ParkStatus> {
  return authFetch<ParkStatus>(`/me/parks/${parkId}`);
}

export function fetchMyVisits(authFetch: AuthFetch): Promise<Visit[]> {
  return authFetch<Visit[]>('/me/visits');
}

export function fetchMyScore(authFetch: AuthFetch): Promise<Score> {
  return authFetch<Score>('/me/score');
}
