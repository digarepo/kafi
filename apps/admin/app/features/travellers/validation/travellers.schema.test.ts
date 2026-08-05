import { describe, expect, it } from 'vitest';

import {
  contactPersonFormSchema,
  registrationFormSchema,
  travellerFormSchema,
} from './travellers.schema';

describe('traveller form schema', () => {
  it('passes for a valid traveller', () => {
    const result = travellerFormSchema.safeParse({
      first_name: 'Abebe',
      middle_name: '',
      last_name: 'Kebede',
      gender: 'Male',
      date_of_birth: '1990-01-01',
      phone_number: '+251911000000',
      email_address: 'abebe@example.com',
      passport_number: '',
      fayda_number: '',
      country_id: '01KZ4SYZ2F1CP8A00SK7MQFM2H',
      region_id: '',
      preferred_language_id: '',
      traveller_source_id: '',
      traveller_status_id: '01KZ4SYG1B5F1FK9XXF6PPS0AB',
    });
    expect(result.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const result = travellerFormSchema.safeParse({
      first_name: '',
      last_name: '',
      phone_number: '',
      country_id: '',
      traveller_status_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('allows an empty email address', () => {
    const result = travellerFormSchema.safeParse({
      first_name: 'Abebe',
      middle_name: '',
      last_name: 'Kebede',
      gender: 'Male',
      date_of_birth: '',
      phone_number: '+251911000000',
      email_address: '',
      passport_number: '',
      fayda_number: '',
      country_id: '01KZ4SYZ2F1CP8A00SK7MQFM2H',
      region_id: '',
      preferred_language_id: '',
      traveller_source_id: '',
      traveller_status_id: '01KZ4SYG1B5F1FK9XXF6PPS0AB',
    });
    expect(result.success).toBe(true);
  });
});

describe('contact person form schema', () => {
  it('passes for a valid contact person', () => {
    const result = contactPersonFormSchema.safeParse({
      first_name: 'Abebe',
      middle_name: '',
      last_name: 'Kebede',
      gender: 'Male',
      date_of_birth: '1990-01-01',
      phone_number: '+251911000000',
      alternate_phone_number: '',
      email_address: '',
      address: '',
      country_id: '',
      region_id: '',
      preferred_language_id: '',
      contact_person_status_id: '01KZ4SYZ2F1CP8A00SK7MQFM2H',
    });
    expect(result.success).toBe(true);
  });
});

describe('registration form schema', () => {
  it('passes for a valid registration', () => {
    const result = registrationFormSchema.safeParse({
      traveller_id: '01KZ4SYZ2F1CP8A00SK7MQFM2H',
      package_version_id: '01KZ4SYZ2F1CP8A00SK7MQFM2I',
      expected_departure_date: '2026-08-10',
      expected_return_date: '2026-08-20',
      remarks: '',
    });
    expect(result.success).toBe(true);
  });
});
