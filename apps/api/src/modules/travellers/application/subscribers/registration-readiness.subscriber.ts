import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FLIGHT_CONFIRMED } from '../../../flights/domain/events/flight-confirmed.event.js';
import { VISA_APPROVED } from '../../../documents/domain/events/visa-approved.event.js';
import { RegistrationsService } from '../services/registrations.service.js';

interface RegistrationWorkflowEvent {
  registration_id: string;
}

@Injectable()
export class RegistrationReadinessSubscriber {
  private readonly logger = new Logger(RegistrationReadinessSubscriber.name);

  constructor(private readonly registrations: RegistrationsService) {}

  @OnEvent(VISA_APPROVED)
  async handleVisaApproved(event: RegistrationWorkflowEvent) {
    await this.autoConfirm(event.registration_id);
  }

  @OnEvent(FLIGHT_CONFIRMED)
  async handleFlightConfirmed(event: RegistrationWorkflowEvent) {
    await this.autoConfirm(event.registration_id);
  }

  private async autoConfirm(registrationId: string) {
    try {
      const registration =
        await this.registrations.autoConfirmReadyForTravel(registrationId);
      if (registration.status === 'READY_FOR_TRAVEL') {
        this.logger.log(
          `Registration ${registration.registration_number} automatically moved to READY_FOR_TRAVEL`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Automatic readiness transition failed for registration ${registrationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
