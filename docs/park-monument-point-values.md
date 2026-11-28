# Park and Monument Point Values

This schedule assigns catalogue points for a recorded park visit. The importer stores the result in `parks.point_value`; hiking, activities, and wildlife sightings add separate points to the visit detail total.

## Point schedule

| Difficulty | Points | Guidance |
| --- | ---: | --- |
| Easy | 20 | Accessible, quick-stop sites; usually National Memorials and National Historic Sites. |
| Medium | 25 | Typical destination parks, including National Parks, National Seashores, and National Recreation Areas. |
| Hard | 50 | Significant travel or access burden, including remote-state sites and standard vehicle-fee destinations. |
| Difficult access | 75 | Access requires a ferry, seaplane, bush plane, four-wheel drive, no roads, or a permit. |
| National Monument | 15 | Fixed value, regardless of size or access indicators. |

## Activity point values

These values come from `api/seed.sql` and are stored in the reference tables. A visit earns the listed points for each recorded entry.

### Hikes

| Difficulty | Points |
| --- | ---: |
| Easy | 5 |
| Moderate | 10 |
| Hard | 20 |

A visit can record one hike at each difficulty level.

### Activities

| Activity | Points |
| --- | ---: |
| Photography | 3 |
| Camping | 8 |
| Birdwatching | 4 |
| Geological Exploration | 5 |
| Backcountry Travel | 10 |
| Historical Site Visit | 3 |
| Stargazing | 5 |
| Wildflower Identification | 4 |
| Horseback Riding | 7 |
| Fishing | 6 |

An activity can be recorded only when it is listed as available for the visit's park.

### Wildlife sightings

Wildlife points are `base_points × rarity_multiplier`. The calculation can produce fractional values.

| Animal | Base points | Multiplier | Points |
| --- | ---: | ---: | ---: |
| Gray Wolf | 10 | 3.5 | 35 |
| Grizzly Bear | 10 | 3.5 | 35 |
| Mountain Lion | 10 | 3.0 | 30 |
| Bald Eagle | 8 | 2.5 | 20 |
| Bighorn Sheep | 8 | 2.5 | 20 |
| Moose | 8 | 2.5 | 20 |
| Black Bear | 7 | 2.0 | 14 |
| Elk | 7 | 2.0 | 14 |
| Mule Deer | 6 | 1.8 | 10.8 |
| Coyote | 6 | 1.8 | 10.8 |
| White-tailed Deer | 5 | 1.5 | 7.5 |
| Pronghorn | 5 | 1.5 | 7.5 |
| Bobcat | 6 | 1.7 | 10.2 |
| Squirrel | 2 | 1.0 | 2 |
| Rabbit | 2 | 1.0 | 2 |
| Raven | 3 | 1.2 | 3.6 |
| Hawk | 5 | 1.5 | 7.5 |
| Blue Jay | 2 | 1.0 | 2 |
| Turkey Vulture | 3 | 1.2 | 3.6 |

Each species can be recorded once per visit.

## Visit total

`GET /visits/:id` reports the check-in's eligible park points as `visit_points`, the sum of recorded hikes, activities, and sightings as `activity_points`, and their sum as `total_points`. The `user_scores` leaderboard still counts park check-in points only; these activity points are currently visit-detail totals, not leaderboard points.

## Assignment rules

- Start from the NPS designation: National Memorial and National Historic Site are Easy; National Park, National Seashore, and National Recreation Area are Medium. A National Monument receives its fixed 15 points. A National Monument in a major metro area is an Easy site by the guide, but the existing point scheme sets monuments to 15, so the fixed monument value takes precedence.
- A National Monument’s fixed value is 15 even when other difficulty clues are present.
- Bump sites in Alaska (AK), Hawaii (HI), American Samoa (AS), or the U.S. Virgin Islands (VI) up one tier, capped at Hard.
- Directions or weather mentioning ferry, seaplane, bush plane, four-wheel drive/4WD, no roads, or permit required sets the value to 75.
- Seasonal closures, snow, unpaved roads, or high elevation set at least Medium difficulty.
- A free entrance (`cost: "0.00"`) is a weak Easy signal. A standard vehicle fee from $20 to $35 sets at least Hard. Access signals and remote location take priority over the free-site signal.
- A National Monument inside a major metro area is considered Easy by the guide; it still receives the scheme’s fixed 15 points.
- National Historical Parks remain excluded from the import.

## Awarding points

- Check-ins are scored without a separate verification step. A user may check in at a park multiple times, but earns points only on the first visit and then once each rolling 12 months.
- Calculate eligibility in visit-date order (and ID order for same-day visits). Backdated visits or corrected park values can change previously calculated awards.
- Award one site-visit value per eligible visit. Hiking, camping, activities, and wildlife sightings are scored separately.
- The importer refreshes the catalogue's point value using these rules.
