/**
 * Privacy Policy route for Kafi Tours.
 *
 * @returns The privacy policy page.
 */
export function meta() {
  return [
    { title: "Privacy Policy | Kafi Tours" },
    {
      name: "description",
      content: "Read the Kafi Tours Privacy Policy.",
    },
  ];
}

export default function PrivacyRoute() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-foreground md:py-20">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last Updated: July 2026</p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">1. Information We Collect</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Kafi Tours collects personal information necessary to coordinate and deliver Hajj, Umrah,
          and luxury travel services. This may include:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Full name, phone number, and email address.</li>
          <li>Travel preferences, group size, and accommodation requests.</li>
          <li>
            Passport and visa identification details required by Saudi authorities and travel
            partners.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">2. How We Use Your Information</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          We use the information you provide to:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Process Hajj and Umrah bookings and group travel coordination.</li>
          <li>Provide customer support and respond to enquiries.</li>
          <li>
            Communicate with you directly by phone, email, or WhatsApp regarding your travel plans.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">
          3. Information Sharing & Third Parties
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We only share your personal information with trusted third parties when necessary to
          execute your booking. This includes sharing required passport and travel details with
          Saudi authorities, airlines, hotels, and visa service providers. We do not sell your
          personal data.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">4. Data Security & Retention</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We implement reasonable administrative, technical, and physical safeguards to protect your
          personal information. Your data is retained only for as long as necessary to fulfill the
          purposes for which it was collected, comply with legal obligations, and resolve disputes.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold">5. Your Rights & Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You have the right to access, correct, or request deletion of your personal information.
          To exercise these rights, please contact us at{" "}
          <a className="text-accent hover:underline" href="mailto:info@kafitour.com">
            info@kafitour.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
