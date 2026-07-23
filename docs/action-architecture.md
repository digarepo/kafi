# Action Architecture & Routing Flow

This document is the single source of truth for how user actions on the Kafi Tour & Travel web application map to routes, query parameters, and lead-submission concepts.

---

## 1. User Intent & Destination Matrix

| Intent | Route | Description |
| --- | --- | --- |
| Browse packages | `/packages` | Package listing page. |
| View specific package | `/packages/:slug` | Package detail page for the given slug. |
| Start booking request | `/booking` | Dedicated booking request form. |
| Ask a question / enquiry | `/enquiry` | General enquiry form. |
| Request a callback | `/callback` | Callback request form. |
| Browse services | `/services` | Service listing page. |
| View specific service | `/services/:slug` | Service detail page for the given slug. |
| Read FAQs | `/faq` | Standalone frequently asked questions page. |

---

## 2. Context Rules (Query Parameters)

Context parameters pre-select or tag the origin of an action so the receiving form can surface the right defaults and attribution.

| Parameter | Example | Effect |
| --- | --- | --- |
| `?package=:slug` | `/booking?package=:slug` | Pre-selects the specified package in the booking form. |
| `?package=:slug` | `/enquiry?package=:slug` | Pre-selects the specified package as the subject of the enquiry. |
| `?service=:slug` | `/enquiry?service=:slug` | Pre-selects the specified service as the subject of the enquiry. |
| `?source=:source` | `/callback?source=homepage` | Tracks where the lead originated, e.g. the homepage bottom CTA. |

---

## 3. Page CTA Mapping

### Navbar CTA

- **Label:** Plan My Umrah
- **Destination:** `/booking`

### Hero Primary CTA

- **Label:** View Packages
- **Destination:** `/packages`

### Package Detail Actions

- **Book This Package** → `/booking?package=:slug`
- **Ask a Question** → `/enquiry?package=:slug`

### Service Detail Actions

- **Get Help With This Service** → `/enquiry?service=:slug`

### Homepage Bottom CTA

- **Label:** Request a Callback
- **Destination:** `/callback?source=homepage`

### Footer

- Standard static links only.
- Newsletter subscription is disabled for Phase 1 MVP.

---

## 4. Lead Submission Data Schemas

The following concepts describe the data collected for each lead submission. Optional fields are marked as such.

### TRIP_BOOKING

```
- fullName
- phone
- email (optional)
- package (optional)
- travelPeriod
- groupSize
- message
```

### PACKAGE_ENQUIRY

```
- fullName
- phone
- email (optional)
- package/service context
- message
```

### CALLBACK_REQUEST

```
- phone
- source
```
