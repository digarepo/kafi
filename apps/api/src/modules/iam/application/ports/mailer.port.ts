/**
 * Details of a newly received public inquiry, used to notify staff.
 */
export interface InquiryNotification {
  inquiry_id: string;
  inquiry_number: string;
  inquiry_type: string;
  full_name: string | null;
  phone_number: string;
  email_address: string | null;
  message: string | null;
  enquiry_category: string | null;
  package_interest: string | null;
  service_interest: string | null;
  travel_period: string | null;
  group_size: string | null;
  source_channel: string | null;
  received_at: Date;
}

/**
 * Port for sending transactional emails such as verification and reset links.
 *
 * A production deployment should provide an SMTP-backed implementation.
 */
export abstract class Mailer {
  abstract sendVerificationEmail(to: string, token: string): Promise<void>;
  abstract sendPasswordResetEmail(to: string, token: string): Promise<void>;
  abstract sendWelcomeEmail(
    to: string,
    temporaryPassword: string,
  ): Promise<void>;

  /**
   * Notifies staff that a new public inquiry has been received.
   *
   * @param to - Recipient staff addresses.
   * @param inquiry - The persisted inquiry details.
   */
  abstract sendInquiryNotification(
    to: string[],
    inquiry: InquiryNotification,
  ): Promise<void>;
}
