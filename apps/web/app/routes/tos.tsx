/**
 * Terms of Service route for Kafi Tours.
 *
 * @returns The terms of service page.
 */
export function meta() {
  return [
    { title: "Terms of Service | Kafi Tours" },
    {
      name: "description",
      content: "Read the Kafi Tours Terms of Service.",
    },
  ];
}

export default function TosRoute() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-foreground md:py-20">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last Updated: July 2026</p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">1. Service Scope</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Kafi Tours coordinates and manages Hajj, Umrah, visa processing, and luxury travel
          logistics. We act as an intermediary between travelers and third-party service providers,
          including airlines, hotels, and government visa portals.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">2. Booking & Enquiries</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Submitting an enquiry or booking request through our website does not guarantee immediate
          confirmation. All bookings are subject to verification and confirmation by a Kafi Tours
          advisor based on availability, pricing, and required documentation.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">3. User Responsibilities</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Travelers are responsible for providing accurate and complete travel documents, including
          a valid passport and any required visa documentation. You must also meet Saudi entry and
          visa requirements as determined by the relevant authorities.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">4. Cancellations & Refunds</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cancellation and refund policies are subject to the terms of airlines, hotels, visa
          authorities, and other third-party service providers. Any refunds will be processed
          according to the policies of these providers and the timing of your cancellation.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-heading text-xl font-semibold">5. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Kafi Tours is not liable for disruptions, delays, or failures caused by third-party
          service providers, including airlines, hotels, government visa portals, or other travel
          operators. We make reasonable efforts to coordinate services but do not control these
          external providers.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold">6. Governing Law</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Terms of Service are governed by the laws of the Federal Democratic Republic of
          Ethiopia. Any disputes arising from these terms shall be resolved in accordance with
          Ethiopian law.
        </p>
      </section>
    </article>
  );
}
