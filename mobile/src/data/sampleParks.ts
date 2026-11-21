import type { Park, SiteClass } from '@/types/park';

// Points per verified visit (docs/park-monument-point-values.md).
export const SITE_POINTS: Record<SiteClass, number> = {
  small: 20,
  medium: 25,
  large: 50,
  hardcore: 75,
  monument: 15,
};

export const SITE_CLASS_LABEL: Record<SiteClass, string> = {
  small: 'Small park',
  medium: 'Medium park',
  large: 'Large park',
  hardcore: 'Hardcore',
  monument: 'Monument',
};

const ts = '2026-11-01T00:00:00.000Z';

// Static sample data for the Sprint 1 mockups. Site classes are placeholders:
// the team has not agreed on size thresholds yet.
export const SAMPLE_PARKS: Park[] = [
  {
    id: 1,
    name: 'Yellowstone National Park',
    description:
      'The first national park in the world, set on top of an active volcano. Geysers, hot springs, the Grand Canyon of the Yellowstone and some of the best wildlife viewing in North America.',
    location: 'ID,MT,WY',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'large',
    activities: ['Photography', 'Camping', 'Geological Exploration', 'Backcountry Travel', 'Fishing', 'Horseback Riding'],
    wildlife: ['Gray Wolf', 'Grizzly Bear', 'Elk', 'Pronghorn', 'Bald Eagle'],
    imageColor: '#B5651D',
  },
  {
    id: 2,
    name: 'Grand Canyon National Park',
    description:
      'A mile-deep canyon carved by the Colorado River, exposing nearly two billion years of geological history in its layered red rock walls.',
    location: 'AZ',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'large',
    activities: ['Photography', 'Camping', 'Geological Exploration', 'Backcountry Travel', 'Stargazing'],
    wildlife: ['Bighorn Sheep', 'Mule Deer', 'Mountain Lion', 'Raven', 'Turkey Vulture'],
    imageColor: '#C0392B',
  },
  {
    id: 3,
    name: 'Rocky Mountain National Park',
    description:
      'High alpine terrain along the Continental Divide, with Trail Ridge Road climbing above 12,000 feet through tundra, lakes and elk meadows.',
    location: 'CO',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'medium',
    activities: ['Photography', 'Camping', 'Wildflower Identification', 'Fishing', 'Horseback Riding', 'Birdwatching'],
    wildlife: ['Elk', 'Moose', 'Bighorn Sheep', 'Black Bear', 'Coyote'],
    imageColor: '#2E7D5B',
  },
  {
    id: 4,
    name: 'Zion National Park',
    description:
      'Towering sandstone cliffs and narrow slot canyons along the Virgin River. Home to Angels Landing and The Narrows.',
    location: 'UT',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'medium',
    activities: ['Photography', 'Camping', 'Geological Exploration', 'Stargazing', 'Birdwatching'],
    wildlife: ['Mule Deer', 'Bighorn Sheep', 'Mountain Lion', 'Bobcat'],
    imageColor: '#D35400',
  },
  {
    id: 5,
    name: 'Arches National Park',
    description:
      'More than 2,000 natural stone arches in a high desert landscape, including the famous Delicate Arch.',
    location: 'UT',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'small',
    activities: ['Photography', 'Geological Exploration', 'Stargazing', 'Camping'],
    wildlife: ['Mule Deer', 'Coyote', 'Rabbit', 'Raven'],
    imageColor: '#E67E22',
  },
  {
    id: 6,
    name: 'Gates of the Arctic National Park',
    description:
      'A roadless wilderness north of the Arctic Circle. No trails, no facilities, reached only by bush plane. One of the least visited parks in the system.',
    location: 'AK',
    created_at: ts,
    updated_at: ts,
    designation: 'National Park',
    siteClass: 'hardcore',
    activities: ['Backcountry Travel', 'Camping', 'Fishing', 'Photography'],
    wildlife: ['Grizzly Bear', 'Gray Wolf', 'Moose', 'Bald Eagle'],
    imageColor: '#34495E',
  },
  {
    id: 7,
    name: 'Devils Tower National Monument',
    description:
      'A striking igneous butte rising 867 feet above the Belle Fourche River. The first national monument, and a sacred site for many Plains tribes.',
    location: 'WY',
    created_at: ts,
    updated_at: ts,
    designation: 'National Monument',
    siteClass: 'monument',
    activities: ['Photography', 'Geological Exploration', 'Historical Site Visit', 'Birdwatching'],
    wildlife: ['White-tailed Deer', 'Squirrel', 'Hawk'],
    imageColor: '#7D5A50',
  },
  {
    id: 8,
    name: 'Muir Woods National Monument',
    description:
      'An old-growth coast redwood forest just north of San Francisco, named after naturalist John Muir.',
    location: 'CA',
    created_at: ts,
    updated_at: ts,
    designation: 'National Monument',
    siteClass: 'monument',
    activities: ['Photography', 'Birdwatching', 'Wildflower Identification'],
    wildlife: ['Mule Deer', 'Squirrel', 'Blue Jay'],
    imageColor: '#1E5631',
  },
];

export function getSampleParkById(id: number): Park | undefined {
  return SAMPLE_PARKS.find((p) => p.id === id);
}

export function pointsFor(park: Park): number | null {
  return park.siteClass ? SITE_POINTS[park.siteClass] : null;
}
