import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { FlightBookingsService } from './application/services/flight-bookings.service.js';
import { AdminFlightBookingsController } from './presentation/controllers/admin-flight-bookings.controller.js';

/**
 * Flights bounded context: flight booking records for registrations.
 *
 * @remarks
 * - This module reads from documents (visa) to enforce the APPROVED visa
 *   precondition and never writes to visa tables.
 * - Flight booking creation directly produces CONFIRMED status.
 * - Imports FinanceModule so flight confirmation can auto-create a Finance
 *   expense for the supplier cost.
 */
@Module({
  imports: [SharedModule, FinanceModule],
  controllers: [AdminFlightBookingsController],
  providers: [FlightBookingsService],
  exports: [FlightBookingsService],
})
export class FlightsModule {}
