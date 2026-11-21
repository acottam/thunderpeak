// Shape of a park as returned by GET /parks and GET /parks/:id (docs/api.md).
export type Park = {
  id: number;
  name: string;
  description: string | null;
  location: string | null; // NPS `states`, comma separated, e.g. "ID,MT,WY"
  created_at: string;
  updated_at: string;

  // Planned fields (Proposed in docs/api.md). Optional until the API returns them.
  park_code?: string;
  designation?: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  point_value?: number | null;
};

// The catalogue holds only national parks and monuments.
export type Designation = 'National Park' | 'National Monument';
