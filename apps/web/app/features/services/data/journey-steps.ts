export interface JourneyStep {
  id: string;
  number: string;
  title: string;
  description: string;
}

export const journeySteps: JourneyStep[] = [
  {
    id: 'documentation',
    number: '1',
    title: 'Secure Documentation',
    description:
      'Complete visa registrations and secure electronic permits directly through our administrative office.',
  },
  {
    id: 'travel',
    number: '2',
    title: 'Align Flight & Lodging',
    description:
      'Synchronize premium Ethiopian Airlines ticketing with luxury hotels strategically situated close to Haram gates.',
  },
  {
    id: 'pilgrimage',
    number: '3',
    title: 'Perform Rites Confidently',
    description:
      'Embark under the guidance of certified spiritual guides and Islamic scholars during all Hajj & Umrah events.',
  },
];
