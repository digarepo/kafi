import type { PackageItem } from '../types/package.types';

export const packages: PackageItem[] = [
  {
    id: 'economy',
    slug: 'economy',
    name: 'Economy',
    subtitle: 'Essential Umrah Experience',
    price: 'ETB 145,000',
    duration: '10 Days',
    groupSize: '20–25 pilgrims',
    description:
      'A thoughtfully planned Umrah journey for pilgrims who want the essential experience handled properly, comfortably, and transparently.',
    idealFor:
      'Ideal for individuals and families looking for a complete Umrah experience while keeping the overall journey affordable.',
    experience:
      'You receive the essential travel, accommodation, visa, transport, and guidance services needed to focus on your worship without worrying about the logistics.',
    highlights: [
      'Return economy flight tickets',
      '3-star accommodation near the Haram',
      'Complete visa processing',
      'Airport and inter-city transfers',
      'Guided Umrah rituals',
      'Ziyarah visits',
    ],

    itinerary: [
      {
        phase: '01',
        title: 'Departure & Arrival',
        description:
          'Begin your journey from Addis Ababa and arrive in Saudi Arabia. Our team coordinates your airport transfer and hotel check-in so you can settle comfortably into your pilgrimage.',
      },
      {
        phase: '02',
        title: 'Madinah Experience',
        description:
          'Spend time in Madinah, visit Masjid an-Nabawi, and explore significant historical sites through guided Ziyarah visits.',
      },
      {
        phase: '03',
        title: 'Journey to Makkah',
        description:
          'Travel to Makkah with your group, prepare for Umrah, and complete your rituals with guidance and support throughout the process.',
      },
      {
        phase: '04',
        title: 'Makkah & Return Journey',
        description:
          'Spend your remaining days in Makkah focused on worship, additional prayers, reflection, and selected historical visits before your return journey.',
      },
    ],
  },

  {
    id: 'comfort',
    slug: 'comfort',
    name: 'Comfort',
    subtitle: 'Our Most Balanced Experience',
    price: 'ETB 160,000',
    duration: '14 Days',
    groupSize: '15–20 pilgrims',
    badge: 'Most Popular',
    popular: true,
    description:
      'The right balance between comfort, spiritual guidance, and personal attention for pilgrims who want more from their journey.',
    idealFor:
      'Ideal for pilgrims who want a longer stay, better accommodation, smaller groups, and a more guided spiritual experience.',
    experience:
      'From premium accommodation and comprehensive transport to scholar-led guidance and daily learning, this package gives you space to focus deeply on your pilgrimage.',
    highlights: [
      'Return economy flight tickets',
      '4-star accommodation near the Haram',
      'Complete visa processing',
      'All ground transportation',
      'Scholar-led Umrah guidance',
      'Full Makkah and Madinah Ziyarah',
      'Daily Islamic lectures and Q&A',
      'Breakfast and dinner',
    ],

    itinerary: [
      {
        phase: 'Day 1–2',
        title: 'Departure & Arrival in Madinah',
        description:
          'Fly from Addis Ababa to Madinah and transfer to your hotel. Settle in and begin your stay near Masjid an-Nabawi with time for prayer and rest.',
      },
      {
        phase: 'Day 3–5',
        title: 'Madinah Ziyarah & Spiritual Programme',
        description:
          'Explore important historical sites including Quba Mosque, Masjid al-Qiblatayn, and Uhud. Participate in scholar-led sessions and daily Islamic learning programmes.',
      },
      {
        phase: 'Day 6–7',
        title: 'Journey to Makkah & Umrah',
        description:
          'Travel from Madinah to Makkah, enter Ihram, and perform Umrah with guidance from qualified scholars. Our team supports you throughout every stage of the rituals.',
      },
      {
        phase: 'Day 8–11',
        title: 'Makkah Stay & Ziyarah',
        description:
          'Spend your days in Makkah focused on prayer, worship, and reflection while visiting important historical sites around the city.',
      },
      {
        phase: 'Day 12–14',
        title: 'Final Worship & Departure',
        description:
          'Use your final days for additional worship and personal reflection before completing your stay and beginning your journey home.',
      },
    ],
  },

  {
    id: 'premium',
    slug: 'premium',
    name: 'Premium',
    subtitle: 'An Elevated Spiritual Journey',
    price: 'ETB 240,000',
    duration: '14 Days',
    groupSize: '10–12 pilgrims',
    badge: 'Premium',
    description:
      'A more private and elevated pilgrimage experience designed for those who value comfort, personal attention, and a carefully managed journey.',
    idealFor:
      'Ideal for pilgrims, families, and private groups seeking the highest level of comfort and personalised service.',
    experience:
      'With smaller groups, premium accommodation, private transportation, dedicated guidance, and concierge-level support, the logistics become almost invisible so you can focus on the spiritual journey.',
    highlights: [
      'Return flight tickets',
      '5-star accommodation',
      'Express visa processing',
      'Private transportation',
      'Senior scholar-led guidance',
      'VIP Ziyarah experience',
      'Full-board meals',
      'Laundry and concierge service',
      'Exclusive Islamic lectures',
    ],

    itinerary: [
      {
        phase: 'Day 1–2',
        title: 'Premium Arrival Experience',
        description:
          'Travel from Addis Ababa to Madinah and enjoy a smooth, privately coordinated arrival experience. Settle into your premium accommodation and begin your pilgrimage at Masjid an-Nabawi.',
      },
      {
        phase: 'Day 3–5',
        title: 'Private Madinah Ziyarah',
        description:
          'Explore the historical sites of Madinah with dedicated guidance, including Quba Mosque, Uhud, Masjid al-Qiblatayn, and other significant locations.',
      },
      {
        phase: 'Day 6–7',
        title: 'Private Transfer & Umrah',
        description:
          'Travel comfortably to Makkah with private transportation. With your scholar and guide, complete your Umrah rituals with personalised support and guidance.',
      },
      {
        phase: 'Day 8–10',
        title: 'Makkah Worship & Private Ziyarah',
        description:
          'Focus on worship and spiritual reflection while enjoying private transportation and a personalised Ziyarah experience around the historical sites of Makkah.',
      },
      {
        phase: 'Day 11–12',
        title: 'Personalised Spiritual Programme',
        description:
          'Take part in exclusive Islamic lectures, private consultations, and a flexible spiritual programme designed around the needs of your group.',
      },
      {
        phase: 'Day 13–14',
        title: 'Final Days & Departure',
        description:
          'Complete your final prayers and personal worship before enjoying a carefully coordinated departure and return journey home.',
      },
    ],
  },
];
