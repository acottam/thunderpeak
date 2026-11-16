// Shape of a park as returned by GET /parks and GET /parks/:id.
// The first block mirrors the `parks` table exactly, so swapping the
// sample data for the real API later should not change any screen code.
export type ApiPark = {
  id: number;
  name: string;
  description: string | null;
  location: string | null; // NPS `states`, comma separated, e.g. "WY,MT,ID"
  created_at: string;
  updated_at: string;
};

export type Designation = 'National Park' | 'National Historical Park' | 'National Monument';

// Sprint 1 point schedule from docs/park-monument-point-values.md.
export type SiteClass = 'small' | 'medium' | 'large' | 'hardcore' | 'monument';

// Fields the app will need but the API does not return yet.
// They are optional so real API rows still type-check.
export type Park = ApiPark & {
  designation?: Designation;
  siteClass?: SiteClass;
  activities?: string[]; // names from the `activities` seed table
  wildlife?: string[]; // names from the `animals` seed table
  imageColor?: string; // placeholder banner color until NPS images are wired up
};
