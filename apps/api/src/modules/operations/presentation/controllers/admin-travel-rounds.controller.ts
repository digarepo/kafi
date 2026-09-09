import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { TravelRoundsService } from '../../application/services/travel-rounds.service.js';
import { CreateTravelRoundDto, UpdateTravelRoundDto, TravelRoundFiltersDto } from '../../application/dto/operations.dto.js';

/** Admin API for planning and operating registration travel rounds. */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTravelRoundsController {
  constructor(private readonly rounds: TravelRoundsService) {}
  @Get('travel-rounds') @RequirePermissions('TRAVEL_ROUND_VIEW') list(@Query() filters: TravelRoundFiltersDto) { return this.rounds.listTravelRounds(filters); }
  @Get('travel-rounds/:id') @RequirePermissions('TRAVEL_ROUND_VIEW') get(@Param('id') id: string) { return this.rounds.getTravelRound(id); }
  @Post('travel-rounds') @RequirePermissions('TRAVEL_ROUND_MANAGE') create(@Body() dto: CreateTravelRoundDto, @Req() req: any) { return this.rounds.createTravelRound(dto, req.user.sub); }
  @Patch('travel-rounds/:id') @RequirePermissions('TRAVEL_ROUND_MANAGE') update(@Param('id') id: string, @Body() dto: UpdateTravelRoundDto, @Req() req: any) { return this.rounds.updateTravelRound(id, dto, req.user.sub); }
  @Delete('travel-rounds/:id') @RequirePermissions('TRAVEL_ROUND_MANAGE') remove(@Param('id') id: string, @Req() req: any) { return this.rounds.deleteTravelRound(id, req.user.sub); }
}
