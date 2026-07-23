import {
  AirplaneIcon,
  BedIcon,
  CarIcon,
  CompassIcon,
  FileTextIcon,
  GraduationCapIcon,
} from '@phosphor-icons/react';

import type { ServiceItem } from '../types/service.types';

export const services: ServiceItem[] = [
  {
    id: 'visa-processing',
    slug: 'visa-processing',
    icon: FileTextIcon,
    name: 'Visa Processing',
    tagline: 'End-to-End Documentation',
    description:
      'Complete Saudi visa processing from application to approval. We handle all documentation, biometrics, and consulate follow-ups.',
    details:
      'Our experienced visa team navigates the full Saudi consulate application process on your behalf. We prepare and verify all required documents including your passport, passport photos, vaccination records, and booking confirmations. We submit applications, track status, and handle any queries — ensuring your visa is approved in time.',
    steps: [
      {
        title: 'Document Collection & Verification',
        description:
          'We collect and carefully review your passport, photographs, vaccination records, and other required documents to ensure everything is complete and accurate before submission.',
      },
      {
        title: 'Visa Application Preparation',
        description:
          'Our team prepares and completes the required visa application forms, ensuring that your information is correctly submitted according to current Saudi entry requirements.',
      },
      {
        title: 'Biometric Appointment Coordination',
        description:
          'We coordinate your biometric appointment and guide you through the process so that all required biometric information is completed without unnecessary delays.',
      },
      {
        title: 'Application Submission & Tracking',
        description:
          'Once submitted, we monitor your application status and handle follow-ups or additional requirements that may arise during the processing period.',
      },
      {
        title: 'Visa Delivery & Travel Preparation',
        description:
          'After approval, your visa documentation is delivered and our team helps you prepare for the next stage of your pilgrimage journey.',
      },
    ],
    tag: 'Essential',
  },

  {
    id: 'ticketing',
    slug: 'ticketing',
    icon: AirplaneIcon,
    name: 'Ticketing & Flights',
    tagline: 'Flights Sorted, Stress-Free',
    description:
      'We source and book the most suitable return flights for your Umrah trip, coordinating departure dates via Ethiopian Airlines.',
    details:
      'Kafi Tours works with Ethiopian Airlines to find the best available flights at competitive prices. We coordinate group check-ins, handle seat preferences, and ensure all pilgrims are on the same flight where possible. We also provide detailed pre-flight guidance and handle any flight changes or re-bookings.',
    steps: [
      {
        title: 'Flight Search & Route Planning',
        description:
          'We search available flight options from your departure city and identify routes that best match your travel dates, group size, and pilgrimage itinerary.',
      },
      {
        title: 'Best-Rate Booking & Confirmation',
        description:
          'Once the most suitable option is selected, we coordinate the booking and provide clear confirmation details for your journey.',
      },
      {
        title: 'Group Flight Coordination',
        description:
          'For group pilgrimages, we coordinate flight arrangements wherever possible so that members of the group can travel together.',
      },
      {
        title: 'E-Ticket Delivery & Travel Guidance',
        description:
          'Your confirmed e-ticket and essential pre-flight information are delivered before departure, helping you travel with confidence.',
      },
      {
        title: 'Rebooking & Flight Support',
        description:
          'If changes or unexpected travel issues arise, our team assists with rebooking and coordinates the next steps with you.',
      },
    ],
    tag: 'Included',
  },

  {
    id: 'accommodation',
    slug: 'accommodation',
    icon: BedIcon,
    name: 'Luxury Accommodations',
    tagline: 'Comfort Near the Haram',
    description:
      'Selected hotels in Makkah and Madinah, chosen for their proximity to the Haram, cleanliness, and premium services.',
    details:
      'We partner with trusted hotels within walking distance of Masjid al-Haram in Makkah and Masjid an-Nabawi in Madinah. All accommodations are vetted for cleanliness, safety, and service quality. Rooms are arranged for easy proximity between group members, and special requirements (accessibility, family rooms) are accommodated.',
    steps: [
      {
        title: 'Hotel Selection Based on Package',
        description:
          'We select suitable accommodation based on your chosen package, considering location, hotel standard, proximity to the Haram, and the needs of your group.',
      },
      {
        title: 'Room Allocation & Preferences',
        description:
          'Room arrangements are coordinated according to group requirements, family needs, and available preferences to make your stay as comfortable as possible.',
      },
      {
        title: 'Check-In Coordination',
        description:
          'Our team helps coordinate the arrival and check-in process so that your accommodation is ready and your group can settle in smoothly.',
      },
      {
        title: 'Support Throughout Your Stay',
        description:
          'Our team remains available to assist with accommodation-related needs and help resolve any issues that may arise during your stay.',
      },
      {
        title: 'Checkout & Onward Travel',
        description:
          'We coordinate checkout timing and help connect your accommodation arrangements with the next stage of your pilgrimage itinerary.',
      },
    ],
    tag: 'Included',
  },

  {
    id: 'ground-transport',
    slug: 'ground-transport',
    icon: CarIcon,
    name: 'Ground Transport',
    tagline: 'Seamless Coordination',
    description:
      'All ground transportation is coordinated for you — airport pickups, inter-city transfers, and transportation to Ziyarah sites.',
    details:
      'From the moment you land at Jeddah or Madinah airport, our ground team is ready. We use comfortable, air-conditioned coaches and minibuses. All transfers between Makkah and Madinah are smooth and scheduled. Private vehicle options are available for premium packages.',
    steps: [
      {
        title: 'Airport Pickup & Arrival Coordination',
        description:
          'Our ground team coordinates your arrival transfer from the airport and helps ensure a smooth connection to your accommodation.',
      },
      {
        title: 'Hotel & Haram Transportation',
        description:
          'Where included in your package, transportation is coordinated between your hotel and key pilgrimage locations for convenient movement during your stay.',
      },
      {
        title: 'Makkah–Madinah Transfers',
        description:
          'We coordinate the inter-city journey between Makkah and Madinah according to your group itinerary and scheduled travel arrangements.',
      },
      {
        title: 'Ziyarah Site Transportation',
        description:
          'Comfortable transportation is arranged for guided visits to significant historical and religious sites throughout your pilgrimage.',
      },
      {
        title: 'Airport Drop-Off & Departure',
        description:
          'At the end of your journey, we coordinate your transfer to the airport and help ensure your departure arrangements remain on schedule.',
      },
    ],
    tag: 'Included',
  },

  {
    id: 'guided-tours',
    slug: 'guided-tours',
    icon: CompassIcon,
    name: 'Guided Ziyarah Tours',
    tagline: 'Journey Through History',
    description:
      'Expert-guided visits to the most significant historical and religious sites in Makkah and Madinah, enriching your journey.',
    details:
      'Our Ziyarah tours are led by knowledgeable guides who bring each site to life with its historical and spiritual significance. Sites include Jabal al-Noor, Jabal Thawr, Quba Mosque, Uhud, Masjid al-Qiblatayn, and more. Each visit is an opportunity for reflection, learning, and deepening your connection to Islamic history.',
    steps: [
      {
        title: 'Makkah Historical Sites',
        description:
          'Explore significant locations around Makkah with guidance and historical context that helps connect each site to the broader story of Islamic history.',
      },
      {
        title: 'Madinah Historical Sites',
        description:
          'Visit important locations in and around Madinah while learning about their significance and connection to the life of the Prophet ﷺ and the early Muslim community.',
      },
      {
        title: 'Uhud Battlefield Visit',
        description:
          'Visit the historic site of the Battle of Uhud and learn about its important lessons, events, and place in Islamic history.',
      },
      {
        title: 'Historical Mosque Visits',
        description:
          'Visit significant mosques and places of worship while receiving guidance about their historical and religious importance.',
      },
      {
        title: 'Museums & Cultural Sites',
        description:
          'Where included in the itinerary, explore museums and cultural sites that provide further insight into the history and heritage of the region.',
      },
    ],
    tag: 'Included',
  },

  {
    id: 'scholarly-guidance',
    slug: 'scholarly-guidance',
    icon: GraduationCapIcon,
    name: 'Scholar-Led Pilgrimage',
    tagline: 'Spiritually Guided Experience',
    description:
      'Our groups are accompanied by qualified Islamic scholars who guide rituals, deliver lectures, and help you maximise value.',
    details:
      'What sets Kafi Tours apart is our commitment to genuine spiritual guidance. Every group travels with at least one qualified scholar who has extensive knowledge of Umrah fiqh, Seerah, and Islamic history. They guide you through every ritual step, hold daily Q&A circles, and are available throughout the journey for personal consultations.',
    steps: [
      {
        title: 'Pre-Departure Umrah Preparation',
        description:
          'Before departure, pilgrims receive guidance on the essential preparations, rituals, practical considerations, and spiritual mindset needed for the journey.',
      },
      {
        title: 'Ihram & Tawaf Guidance',
        description:
          'Our scholars guide pilgrims through the essential aspects of entering Ihram and performing Tawaf with confidence and understanding.',
      },
      {
        title: "Sa'i & Ritual Completion",
        description:
          "Pilgrims receive guidance through Sa'i and the remaining essential rites of Umrah, helping them complete their worship with confidence.",
      },
      {
        title: 'Daily Halaqa & Islamic Learning',
        description:
          'Throughout the journey, daily learning sessions and Halaqas provide opportunities for reflection, spiritual development, and deeper understanding.',
      },
      {
        title: 'Personal Guidance & Consultation',
        description:
          'Pilgrims can seek personal guidance and ask questions throughout the journey, benefiting from direct access to qualified scholarly support.',
      },
    ],
    tag: 'Unique',
  },
];
