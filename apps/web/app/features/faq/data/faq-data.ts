/**
 * FAQ content for Kafi Tours.
 *
 * @remarks
 * Content is realistic and relevant to Umrah travel with Kafi Tours.
 * No invented statistics, fake claims, or incorrect placeholder data is used.
 */

import { type FaqCategory, type FaqItem } from "../types/faq.types";

const PACKAGES_AND_PRICING: FaqCategory = {
  id: "packages-and-pricing",
  title: "Packages & Pricing",
  items: [
    {
      id: "what-is-included",
      question: "What is included in a Kafi Umrah package?",
      answer:
        "Every package includes flights, Umrah visa processing, accommodation, ground transportation, and guided support. The level of comfort and personal attention varies by tier. You can compare details on the Packages page.",
    },
    {
      id: "how-much-does-it-cost",
      question: "How much does a package cost?",
      answer:
        "Pricing depends on the package level, travel dates, hotel category, and room arrangement. Current prices are listed on each package page, and we can prepare a personal quote when you enquire.",
    },
    {
      id: "are-flights-included",
      question: "Are flights included in all packages?",
      answer:
        "Yes, return flights coordinated with Ethiopian Airlines from Addis Ababa are included as part of every package.",
    },
  ],
};

const BOOKING_AND_PAYMENTS: FaqCategory = {
  id: "booking-and-payments",
  title: "Booking & Payments",
  items: [
    {
      id: "how-do-i-book",
      question: "How do I book a package?",
      answer:
        "Start by sending an enquiry through the contact form, calling us, or messaging on WhatsApp. A travel coordinator will confirm availability, explain the itinerary, and guide you through the booking steps.",
    },
    {
      id: "is-deposit-required",
      question: "Is a deposit required?",
      answer:
        "A deposit is usually required to confirm your place, with the balance due before travel. The exact schedule is shared with your booking confirmation.",
    },
    {
      id: "can-i-change-booking",
      question: "Can I change my booking after payment?",
      answer:
        "Changes depend on the airline and hotel cancellation policies at the time of booking. We will explain the flexibility of your package before you commit.",
    },
  ],
};

const VISA_AND_DOCUMENTATION: FaqCategory = {
  id: "visa-and-documentation",
  title: "Visa & Documentation",
  items: [
    {
      id: "do-you-help-with-visa",
      question: "Do you help with the Umrah visa?",
      answer:
        "Yes, Umrah visa processing is included in our packages. We guide you through the documents needed and submit the application through the proper channels.",
    },
    {
      id: "what-documents-do-i-need",
      question: "What documents do I need?",
      answer:
        "Requirements can change, but generally include a valid passport, passport-size photos, and a vaccination certificate. We provide a current checklist once you start your booking.",
    },
    {
      id: "how-long-visa-processing",
      question: "How long does visa processing take?",
      answer:
        "Processing times vary based on embassy schedules and your travel dates. We recommend starting early so there is enough time for any follow-up requests.",
    },
  ],
};

const FLIGHTS_AND_TRANSPORTATION: FaqCategory = {
  id: "flights-and-transportation",
  title: "Flights & Transportation",
  items: [
    {
      id: "which-airline",
      question: "Which airline do you use?",
      answer:
        "We coordinate return flights with Ethiopian Airlines, departing from Addis Ababa to Jeddah.",
    },
    {
      id: "are-transfers-included",
      question: "Are airport transfers included?",
      answer:
        "Yes, ground transport between airports, hotels, and holy sites is arranged as part of the package.",
    },
    {
      id: "fly-from-another-city",
      question: "Can I fly from another city?",
      answer:
        "Our packages are designed around Addis Ababa departures. If you are travelling from another city, contact us and we can discuss possible arrangements.",
    },
  ],
};

const HOTELS_AND_ACCOMMODATION: FaqCategory = {
  id: "hotels-and-accommodation",
  title: "Hotels & Accommodation",
  items: [
    {
      id: "where-are-hotels",
      question: "Where are the hotels located?",
      answer:
        "Hotels are selected based on the package tier and availability. We aim to provide convenient access to the Haram in Makkah and to the Prophet’s Mosque in Madinah.",
    },
    {
      id: "can-i-choose-hotel",
      question: "Can I choose my hotel?",
      answer:
        "Hotel options are tied to each package. Upgrades may be available depending on the season and availability. Let us know your preference when you enquire.",
    },
    {
      id: "will-i-share-room",
      question: "Will I share a room?",
      answer:
        "Room arrangements depend on the package and your booking group. We can arrange single, double, family, and group rooms where available.",
    },
  ],
};

const THE_UMRAH_JOURNEY: FaqCategory = {
  id: "the-umrah-journey",
  title: "The Umrah Journey",
  items: [
    {
      id: "is-guidance-provided",
      question: "Is guidance provided during Umrah?",
      answer:
        "Yes, our packages include group guidance for the rites of Umrah and visits to historical sites in Makkah and Madinah.",
    },
    {
      id: "are-ziyarah-included",
      question: "Are Ziyarah visits included?",
      answer:
        "Guided Ziyarah visits to significant sites in Makkah and Madinah are included in our packages.",
    },
    {
      id: "first-time-umrah",
      question: "What if I have never performed Umrah before?",
      answer:
        "Many of our guests are first-time pilgrims. We provide pre-departure briefings and on-the-ground guidance to help you feel prepared.",
    },
  ],
};

const GROUPS_AND_FAMILIES: FaqCategory = {
  id: "groups-and-families",
  title: "Groups & Families",
  items: [
    {
      id: "can-families-travel",
      question: "Can families travel together?",
      answer:
        "Yes, we regularly arrange packages for families. We can coordinate family rooms and seating where possible.",
    },
    {
      id: "do-you-organise-groups",
      question: "Do you organise group packages?",
      answer:
        "Yes, we can arrange group departures for mosques, organisations, and extended families. Contact us to discuss your group size and dates.",
    },
    {
      id: "children-and-elderly",
      question: "Are children and elderly travellers welcome?",
      answer:
        "Yes. We can advise on the most suitable package and arrange support for older pilgrims and young children.",
    },
  ],
};

const BEFORE_YOU_TRAVEL: FaqCategory = {
  id: "before-you-travel",
  title: "Before You Travel",
  items: [
    {
      id: "what-should-i-bring",
      question: "What should I bring?",
      answer:
        "We provide a pre-travel checklist covering clothing, documents, medication, and other essentials once your booking is confirmed.",
    },
    {
      id: "do-i-need-vaccinations",
      question: "Do I need vaccinations?",
      answer:
        "Umrah travellers typically need meningitis vaccination and may need other immunisations depending on current requirements. We share the latest guidance during preparation.",
    },
    {
      id: "when-should-i-book",
      question: "When should I book?",
      answer:
        "We recommend booking as early as possible, especially during peak seasons. Early booking also gives more time for visa processing and preparation.",
    },
  ],
};

/** Full FAQ content grouped by category. */
export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  PACKAGES_AND_PRICING,
  BOOKING_AND_PAYMENTS,
  VISA_AND_DOCUMENTATION,
  FLIGHTS_AND_TRANSPORTATION,
  HOTELS_AND_ACCOMMODATION,
  THE_UMRAH_JOURNEY,
  GROUPS_AND_FAMILIES,
  BEFORE_YOU_TRAVEL,
];

/** Compact set of questions shown on the homepage FAQ preview. */
export const FAQ_PREVIEW: readonly FaqItem[] = [
  PACKAGES_AND_PRICING.items[0],
  PACKAGES_AND_PRICING.items[1],
  VISA_AND_DOCUMENTATION.items[0],
  FLIGHTS_AND_TRANSPORTATION.items[0],
  GROUPS_AND_FAMILIES.items[0],
];
