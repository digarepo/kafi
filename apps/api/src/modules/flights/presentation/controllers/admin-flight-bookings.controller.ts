import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { FlightBookingsService } from '../../application/services/flight-bookings.service.js';
import {
  CreateFlightBookingDto,
  UpdateFlightBookingDto,
  CancelFlightBookingDto,
  FlightBookingFiltersDto,
} from '../../application/dto/flight-bookings.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFlightBookingsController {
  constructor(private readonly flights: FlightBookingsService) {}

  @Get('flight-bookings')
  @RequirePermissions('FLIGHT_VIEW')
  listFlightBookings(@Query() filters: FlightBookingFiltersDto) {
    return this.flights.listFlightBookings(filters);
  }

  @Post('flight-bookings')
  @RequirePermissions('FLIGHT_MANAGE')
  createFlightBooking(@Body() dto: CreateFlightBookingDto, @Req() req: any) {
    return this.flights.createFlightBooking(dto, req.user.sub);
  }

  @Get('flight-bookings/:id')
  @RequirePermissions('FLIGHT_VIEW')
  getFlightBooking(@Param('id') id: string) {
    return this.flights.getFlightBooking(id);
  }

  @Patch('flight-bookings/:id')
  @RequirePermissions('FLIGHT_MANAGE')
  updateFlightBooking(
    @Param('id') id: string,
    @Body() dto: UpdateFlightBookingDto,
    @Req() req: any,
  ) {
    return this.flights.updateFlightBooking(id, dto, req.user.sub);
  }

  @Post('flight-bookings/:id/cancel')
  @RequirePermissions('FLIGHT_MANAGE')
  cancelFlightBooking(
    @Param('id') id: string,
    @Body() dto: CancelFlightBookingDto,
    @Req() req: any,
  ) {
    return this.flights.cancelFlightBooking(id, dto, req.user.sub);
  }

  @Delete('flight-bookings/:id')
  @RequirePermissions('FLIGHT_MANAGE')
  softDeleteFlightBooking(@Param('id') id: string, @Req() req: any) {
    return this.flights.softDelete(id, req.user.sub);
  }

  @Get('flight-booking-statuses')
  @RequirePermissions('FLIGHT_VIEW')
  listFlightBookingStatuses() {
    return this.flights.listStatuses();
  }

  @Get('flight-eligible-registrations')
  @RequirePermissions('FLIGHT_VIEW')
  listEligibleRegistrations(@Query('search') search?: string) {
    return this.flights.listEligibleRegistrations(search);
  }

  @Get('registrations/:id/flight-bookings')
  @RequirePermissions('FLIGHT_VIEW')
  listRegistrationFlightBookings(
    @Param('id') id: string,
    @Query() filters: FlightBookingFiltersDto,
  ) {
    return this.flights.listFlightBookings({
      ...filters,
      registration_id: id,
    });
  }
}
