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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { DocumentsService } from '../../application/services/documents.service.js';
import {
  ChangeDocumentStatusDto,
  ChangeDocumentVerificationDto,
  CreateDocumentDto,
  DocumentFiltersDto,
  UpdateDocumentDto,
} from '../../application/dto/documents.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('documents')
  @RequirePermissions('DOCUMENT_VIEW')
  listDocuments(@Query() filters: DocumentFiltersDto) {
    return this.documents.listDocuments(filters);
  }

  @Post('documents')
  @RequirePermissions('DOCUMENT_MANAGE')
  @UseInterceptors(FileInterceptor('file'))
  createDocument(
    @UploadedFile() file: any,
    @Body() dto: CreateDocumentDto,
    @Req() req: any,
  ) {
    return this.documents.createDocument(dto, file, req.user.sub);
  }

  @Get('document-types')
  @RequirePermissions('DOCUMENT_VIEW')
  listDocumentTypes() {
    return this.documents.listDocumentTypes();
  }

  @Get('document-statuses')
  @RequirePermissions('DOCUMENT_VIEW')
  listDocumentStatuses() {
    return this.documents.listDocumentStatuses();
  }

  @Get('verification-statuses')
  @RequirePermissions('DOCUMENT_VIEW')
  listVerificationStatuses() {
    return this.documents.listVerificationStatuses();
  }

  @Get('documents/:id')
  @RequirePermissions('DOCUMENT_VIEW')
  getDocument(@Param('id') id: string) {
    return this.documents.getDocument(id);
  }

  @Get('documents/:id/download')
  @RequirePermissions('DOCUMENT_VIEW')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mime_type, original_filename } =
      await this.documents.download(id);
    res.set({
      'Content-Type': mime_type ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${original_filename ?? 'document'}"`,
    });
    res.send(buffer);
  }

  @Patch('documents/:id')
  @RequirePermissions('DOCUMENT_MANAGE')
  updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.documents.updateDocument(id, dto, req.user.sub);
  }

  @Delete('documents/:id')
  @RequirePermissions('DOCUMENT_MANAGE')
  softDeleteDocument(@Param('id') id: string, @Req() req: any) {
    return this.documents.softDelete(id, req.user.sub);
  }

  @Post('documents/:id/change-verification')
  @RequirePermissions('DOCUMENT_MANAGE')
  changeVerification(
    @Param('id') id: string,
    @Body() dto: ChangeDocumentVerificationDto,
    @Req() req: any,
  ) {
    return this.documents.changeVerification(id, dto, req.user.sub);
  }

  @Post('documents/:id/change-status')
  @RequirePermissions('DOCUMENT_MANAGE')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeDocumentStatusDto,
    @Req() req: any,
  ) {
    return this.documents.changeStatus(id, dto, req.user.sub);
  }

  @Get('travellers/:id/documents')
  @RequirePermissions('DOCUMENT_VIEW')
  listTravellerDocuments(
    @Param('id') id: string,
    @Query() filters: DocumentFiltersDto,
  ) {
    return this.documents.listDocuments({ ...filters, traveller_id: id });
  }

  @Get('registrations/:id/documents')
  @RequirePermissions('DOCUMENT_VIEW')
  listRegistrationDocuments(
    @Param('id') id: string,
    @Query() filters: DocumentFiltersDto,
  ) {
    return this.documents.listDocuments({ ...filters, registration_id: id });
  }
}
