import { MySql2Database } from "drizzle-orm/mysql2";
import { ulid } from "ulid";
import * as schema from "../schema/index.js";

type AirlinesDb = MySql2Database<typeof schema>;

const AIRLINES = [
  { iata_code: "ET", icao_code: "ETH", name: "Ethiopian Airlines", display_order: 1 },
  { iata_code: "SV", icao_code: "SVA", name: "Saudia", display_order: 2 },
  { iata_code: "EK", icao_code: "UAE", name: "Emirates", display_order: 3 },
  { iata_code: "QR", icao_code: "QTR", name: "Qatar Airways", display_order: 4 },
  { iata_code: "TK", icao_code: "THY", name: "Turkish Airlines", display_order: 5 },
  { iata_code: "MS", icao_code: "MSR", name: "Egyptair", display_order: 6 },
] as const;

/** Seeds the active airline reference data used by flight bookings. */
export async function seedAirlines(db: AirlinesDb) {
  for (const airline of AIRLINES) {
    await db
      .insert(schema.airlines)
      .values({
        id: ulid(),
        ...airline,
        is_active: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: airline.name,
          icao_code: airline.icao_code,
          display_order: airline.display_order,
          is_active: true,
          is_deleted: false,
          deleted_at: null,
        },
      });
  }
}
