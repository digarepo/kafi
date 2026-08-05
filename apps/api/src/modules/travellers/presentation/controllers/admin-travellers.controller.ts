import {
  Body,
  Controller,
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
import { TravellersService } from '../../application/services/travellers.service.js';
import {
  CheckDuplicateDto,
  ContactPersonListFiltersDto,
  CreateContactPersonDto,
  CreateTravellerContactDto,
  CreateTravellerDto,
  TravellerListFiltersDto,
  UpdateContactPersonDto,
  UpdateTravellerContactDto,
  UpdateTravellerDto,
} from '../../application/dto/travellers.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTravellersController {
  constructor(private readonly travellers: TravellersService) {}

  // ---- Reference data ----

  @Get('traveller-statuses')
  @RequirePermissions('TRAVELLER_VIEW')
  listTravellerStatuses() {
    return this.travellers.listTravellerStatuses();
  }

  @Get('traveller-sources')
  @RequirePermissions('TRAVELLER_VIEW')
  listTravellerSources() {
    return this.travellers.listTravellerSources();
  }

  @Get('relationship-types')
  @RequirePermissions('TRAVELLER_VIEW')
  listRelationshipTypes() {
    return this.travellers.listRelationshipTypes();
  }

  @Get('contact-person-statuses')
  @RequirePermissions('TRAVELLER_VIEW')
  listContactPersonStatuses() {
    return this.travellers.listContactPersonStatuses();
  }

  @Get('traveller-contact-statuses')
  @RequirePermissions('TRAVELLER_VIEW')
  listTravellerContactStatuses() {
    return this.travellers.listTravellerContactStatuses();
  }

  @Get('registration-statuses')
  @RequirePermissions('REGISTRATION_VIEW')
  listRegistrationStatuses() {
    return this.travellers.listRegistrationStatuses();
  }

  @Get('countries')
  @RequirePermissions('TRAVELLER_VIEW')
  listCountries() {
    return this.travellers.listCountries();
  }

  @Get('regions')
  @RequirePermissions('TRAVELLER_VIEW')
  listRegions(@Query('countryId') countryId?: string) {
    return this.travellers.listRegionsByCountry(countryId);
  }

  @Get('languages')
  @RequirePermissions('TRAVELLER_VIEW')
  listLanguages() {
    return this.travellers.listLanguages();
  }

  // ---- Travellers ----

  @Get('travellers')
  @RequirePermissions('TRAVELLER_VIEW')
  listTravellers(@Query() filters: TravellerListFiltersDto) {
    return this.travellers.listTravellers(filters);
  }

  @Get('travellers/:id')
  @RequirePermissions('TRAVELLER_VIEW')
  getTraveller(@Param('id') id: string) {
    return this.travellers.getTraveller(id);
  }

  @Post('travellers')
  @RequirePermissions('TRAVELLER_CREATE')
  createTraveller(@Body() dto: CreateTravellerDto, @Req() req: any) {
    return this.travellers.createTraveller(dto, req.user.sub);
  }

  @Patch('travellers/:id')
  @RequirePermissions('TRAVELLER_EDIT')
  updateTraveller(
    @Param('id') id: string,
    @Body() dto: UpdateTravellerDto,
    @Req() req: any,
  ) {
    return this.travellers.updateTraveller(id, dto, req.user.sub);
  }

  @Post('travellers/:id/archive')
  @RequirePermissions('TRAVELLER_DELETE')
  archiveTraveller(@Param('id') id: string, @Req() req: any) {
    return this.travellers.archiveTraveller(id, req.user.sub);
  }

  @Post('travellers/check-duplicate')
  @RequirePermissions('TRAVELLER_CREATE', 'TRAVELLER_EDIT')
  checkDuplicate(
    @Body() dto: CheckDuplicateDto,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.travellers.checkDuplicate(dto, excludeId);
  }

  // ---- Contact persons ----

  @Get('contact-persons')
  @RequirePermissions('TRAVELLER_VIEW')
  listContactPersons(@Query() filters: ContactPersonListFiltersDto) {
    return this.travellers.listContactPersons(filters);
  }

  @Get('contact-persons/:id')
  @RequirePermissions('TRAVELLER_VIEW')
  getContactPerson(@Param('id') id: string) {
    return this.travellers.getContactPerson(id);
  }

  @Post('contact-persons')
  @RequirePermissions('TRAVELLER_CREATE')
  createContactPerson(@Body() dto: CreateContactPersonDto, @Req() req: any) {
    return this.travellers.createContactPerson(dto, req.user.sub);
  }

  @Patch('contact-persons/:id')
  @RequirePermissions('TRAVELLER_EDIT')
  updateContactPerson(
    @Param('id') id: string,
    @Body() dto: UpdateContactPersonDto,
    @Req() req: any,
  ) {
    return this.travellers.updateContactPerson(id, dto, req.user.sub);
  }

  @Post('contact-persons/:id/archive')
  @RequirePermissions('TRAVELLER_DELETE')
  archiveContactPerson(@Param('id') id: string, @Req() req: any) {
    return this.travellers.archiveContactPerson(id, req.user.sub);
  }

  // ---- Traveller contacts ----

  @Get('travellers/:travellerId/contacts')
  @RequirePermissions('TRAVELLER_VIEW')
  listTravellerContacts(@Param('travellerId') travellerId: string) {
    return this.travellers.listTravellerContacts(travellerId);
  }

  @Post('travellers/:travellerId/contacts')
  @RequirePermissions('TRAVELLER_CREATE')
  createTravellerContact(
    @Param('travellerId') travellerId: string,
    @Body() dto: CreateTravellerContactDto,
    @Req() req: any,
  ) {
    return this.travellers.createTravellerContact(
      travellerId,
      dto,
      req.user.sub,
    );
  }

  @Patch('travellers/:travellerId/contacts/:contactId')
  @RequirePermissions('TRAVELLER_EDIT')
  updateTravellerContact(
    @Param('contactId') contactId: string,
    @Body() dto: UpdateTravellerContactDto,
    @Req() req: any,
  ) {
    return this.travellers.updateTravellerContact(contactId, dto, req.user.sub);
  }

  @Post('travellers/:travellerId/contacts/:contactId/archive')
  @RequirePermissions('TRAVELLER_DELETE')
  archiveTravellerContact(
    @Param('contactId') contactId: string,
    @Req() req: any,
  ) {
    return this.travellers.archiveTravellerContact(contactId, req.user.sub);
  }
}
