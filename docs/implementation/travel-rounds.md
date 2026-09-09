# Travel rounds

Travel rounds are the controlled lifecycle between a published package and a registration. A round has `PLANNING`, `OPEN`, `CLOSED`, and `COMPLETED` states; only `OPEN` rounds accept new registrations.

Registrations require `travel_round_id`. Expected dates default to the round dates and must remain within them. Registration numbers are allocated by locking `travel_rounds.next_registration_sequence` inside the same database transaction as the registration insert, producing `REG-YYYY-RNN-NNNNNN` (for example `REG-2026-R05-000123`). This deliberately avoids `MAX + 1`, which is unsafe under concurrent intake.

Admin API:

- `GET/POST /api/admin/travel-rounds`
- `GET/PATCH/DELETE /api/admin/travel-rounds/:id`
- `travel-rounds` routes require `TRAVEL_ROUND_VIEW` for reads and `TRAVEL_ROUND_MANAGE` for writes.

Migration `0033_travel_rounds.sql` creates the round counter and registration relationship. Run the database migration before enabling intake.
