import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { RateLimitGuard } from '../../../../shared/application/guards/rate-limit.guard.js';
import { InquiriesService } from '../../application/services/inquiries.service.js';
import {
  PublicBookingInquiryDto,
  PublicCallbackInquiryDto,
  PublicContactInquiryDto,
  PublicEnquiryInquiryDto,
} from '../../application/dto/inquiries.dto.js';

/**
 * Unauthenticated inquiry capture for the public website forms.
 *
 * @remarks
 * - Each form type has its own path so validation stays explicit and so the
 *   `RateLimitGuard` (which keys on `ip:path`) gives each form an independent
 *   budget: a burst of callback requests cannot block a booking submission.
 * - Responses are deliberately minimal and never echo submitted data.
 * - `user_agent` is read from the request; nothing client-supplied in the body
 *   is trusted as metadata. IP addresses are intentionally not persisted.
 */
@Controller('public/inquiries')
@UseGuards(RateLimitGuard)
export class PublicInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Post('booking')
  @HttpCode(201)
  createBooking(@Body() dto: PublicBookingInquiryDto, @Req() req: Request) {
    return this.inquiries.createBookingInquiry(dto, this.context(req));
  }

  @Post('callback')
  @HttpCode(201)
  createCallback(@Body() dto: PublicCallbackInquiryDto, @Req() req: Request) {
    return this.inquiries.createCallbackInquiry(dto, this.context(req));
  }

  @Post('contact')
  @HttpCode(201)
  createContact(@Body() dto: PublicContactInquiryDto, @Req() req: Request) {
    return this.inquiries.createContactInquiry(dto, this.context(req));
  }

  @Post('enquiry')
  @HttpCode(201)
  createEnquiry(@Body() dto: PublicEnquiryInquiryDto, @Req() req: Request) {
    return this.inquiries.createEnquiryInquiry(dto, this.context(req));
  }

  private context(req: Request) {
    const userAgent = req.headers['user-agent'];
    return { userAgent: typeof userAgent === 'string' ? userAgent : undefined };
  }
}
