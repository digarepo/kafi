import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { TravelDocumentsService } from '../../application/services/travel-documents.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTravelDocumentsController {
  constructor(private readonly documents: TravelDocumentsService) {}

  @Get('registrations/:id/travel-itinerary')
  @RequirePermissions('REGISTRATION_VIEW')
  getTravelerItinerary(@Param('id') id: string) {
    return this.documents.getTravelerItinerary(id);
  }

  @Get('travel-groups/:id/guide-manifest')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getGuideManifest(@Param('id') id: string) {
    return this.documents.getGuideManifest(id);
  }

  @Get('travel-groups/:id/group-itinerary')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getGroupItinerary(@Param('id') id: string) {
    return this.documents.getGroupItinerary(id);
  }
}
