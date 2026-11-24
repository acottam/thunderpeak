# Park and Monument Point Values

This schedule assigns catalogue points for a recorded park visit. The importer stores the result in `parks.point_value`; hiking, activities, and wildlife sightings are scored separately.

## Point schedule

| Difficulty | Points | Guidance |
| --- | ---: | --- |
| Easy | 20 | Accessible, quick-stop sites; usually National Memorials and National Historic Sites. |
| Medium | 25 | Typical destination parks, including National Parks, National Seashores, and National Recreation Areas. |
| Hard | 50 | Significant travel or access burden, including remote-state sites and standard vehicle-fee destinations. |
| Difficult access | 75 | Access requires a ferry, seaplane, bush plane, four-wheel drive, no roads, or a permit. |
| National Monument | 15 | Fixed value, regardless of size or access indicators. |

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
