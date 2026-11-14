# Thunderpeak: NPS Park Catalogue Data Requirements

**Owner:** Godwin Obi Bassey\
**Data provider:** National Park Service (NPS)\
**API base URL:** `https://developer.nps.gov/api/v1`\
**Primary endpoint:** `GET /parks`

## 1. Purpose

Use the NPS API as the source of official park and monument information
displayed in Thunderpeak's park catalogue. Thunderpeak-specific
features---such as visit points, ranks, badges and wildlife-sighting
scores---will be managed by the app, not supplied by the NPS API.

## 2. Required park fields

The `/parks` endpoint is the primary source. The fields below are the
proposed catalogue requirements; confirm their presence and exact
response structure against live API responses.

  -----------------------------------------------------------------------
  NPS field               Purpose in Thunderpeak  Priority
  ----------------------- ----------------------- -----------------------
  `id`                    Stable NPS record       Required
                          identifier for linking  
                          and updating records    

  `parkCode`              NPS park code for API   Required
                          lookups and             
                          cross-referencing       

  `fullName`              Park or site name shown Required
                          in catalogue and detail 
                          views                   

  `designation`           Identify the site's     Required
                          designation             
                          (e.g. National Park or  
                          National Monument)      

  `description`           Short overview on the   Required
                          park detail page        

  `states`                State/location          Required
                          filtering and display   

  `latitude`              Geographic location and Required
                          map/check-in reference  

  `longitude`             Geographic location and Required
                          map/check-in reference  

  `images`                Catalogue thumbnail and Recommended
                          park detail imagery     

  `url`                   Link to the official    Recommended
                          NPS page                

  `directionsInfo`        Directions text for     Recommended
                          visitors                

  `directionsUrl`         Link to further         Recommended
                          directions information  

  `operatingHours`        Display operating hours Recommended
                          where available         

  `entranceFees`          Display entrance fee    Recommended
                          information where       
                          available               

  `activities`            Show activities         Recommended
                          associated with the     
                          park                    

  `addresses`             Display physical or     Optional
                          mailing address details 

  `contacts`              Display visitor contact Optional
                          information             

  `weatherInfo`           General visitor         Optional
                          preparation information 
  -----------------------------------------------------------------------

**Note:** Some fields, including `images`, may not be included in the
default response. Use the endpoint's `fields` query parameter to request
additional properties, and verify the supported field names in the NPS
documentation.

## 3. Related endpoints to investigate

  -----------------------------------------------------------------------
  Endpoint                            Potential use
  ----------------------------------- -----------------------------------
  `GET /alerts`                       Show closures, hazards and other
                                      park notices

  `GET /activities`                   Retrieve NPS activity categories

  `GET /activities/parks`             Find parks associated with
                                      particular activities

  `GET /thingstodo`                   Show NPS-recommended experiences

  `GET /campgrounds`                  Provide campground information

  `GET /visitorcenters`               Provide visitor-centre information

  `GET /feespasses`                   Retrieve fee and pass information
  -----------------------------------------------------------------------

These are supplementary to the initial park catalogue and can be
prioritised as the app's requirements develop.

## 4. Thunderpeak-managed fields

The following information should be maintained by Thunderpeak rather
than treated as NPS catalogue data:

  -----------------------------------------------------------------------
  App-managed data                    Purpose
  ----------------------------------- -----------------------------------
  `pointValue`                        Points awarded for a verified visit
                                      to a park/site

  Site category or scoring tier       Thunderpeak's own scoring
                                      classification, if required

  Visit/check-in records              Record a user's visit and
                                      verification details

  User scores, ranks and badges       Gamification and progression

  Wildlife species and rarity scores  Wildlife-sighting points and
                                      classifications
  -----------------------------------------------------------------------

NPS designation can inform site classification, but Thunderpeak must
define its own point values and scoring rules.

## 5. Suggested catalogue data model

A preliminary database mapping could use:

  Thunderpeak field   NPS source
  ------------------- ---------------------
  `npsId`             `id`
  `parkCode`          `parkCode`
  `name`              `fullName`
  `designation`       `designation`
  `description`       `description`
  `states`            `states`
  `latitude`          `latitude`
  `longitude`         `longitude`
  `images`            `images`
  `npsUrl`            `url`
  `operatingHours`    `operatingHours`
  `entranceFees`      `entranceFees`
  `activities`        `activities`
  `pointValue`        Thunderpeak-defined

This is a proposed mapping, not a final database schema. Preserve nested
NPS objects (such as images, hours and fees) in an appropriate
structured format where needed.

## 6. Validation and implementation notes

-   Test `GET /parks` and inspect actual JSON responses before
    finalising the schema.
-   Confirm that the returned sites include the National Parks and
    Monuments required by Thunderpeak; use `designation` to distinguish
    site types.
-   Request optional fields using `fields` where supported.
-   Handle pagination using the endpoint's `limit` and `start`
    parameters.
-   Treat missing or empty values as possible; not every site will have
    every field.
-   Keep the NPS API key on the backend and out of source control and
    mobile-client code.
-   Check the NPS rate-limit guidance before implementing scheduled
    catalogue synchronisation.

## 7. References

-   [NPS API
    documentation](https://www.nps.gov/subjects/developer/api-documentation.htm)
-   [NPS API guides: authentication, rate limits and
    terms](https://www.nps.gov/subjects/developer/guides.htm)
-   [NPS API FAQs](https://www.nps.gov/subjects/developer/faqs.htm)
-   [NPS API
    changelog](https://www.nps.gov/subjects/developer/changelog.htm)
