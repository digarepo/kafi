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
import { HotelsService } from '../../application/services/hotels.service.js';
import {
  CreateHotelDto,
  HotelFiltersDto,
  UpdateHotelDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminHotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get('hotels')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listHotels(@Query() filters: HotelFiltersDto) {
    return this.hotels.listHotels(filters);
  }

  @Get('hotels/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getHotel(@Param('id') id: string) {
    return this.hotels.getHotel(id);
  }

  @Post('hotels')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createHotel(@Body() dto: CreateHotelDto, @Req() req: any) {
    return this.hotels.createHotel(dto, req.user.sub);
  }

  @Patch('hotels/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateHotel(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @Req() req: any,
  ) {
    return this.hotels.updateHotel(id, dto, req.user.sub);
  }

  @Delete('hotels/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteHotel(@Param('id') id: string, @Req() req: any) {
    return this.hotels.deleteHotel(id, req.user.sub);
  }
}
