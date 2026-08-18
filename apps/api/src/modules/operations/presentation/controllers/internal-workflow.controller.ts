import { Controller, Post, UseGuards } from '@nestjs/common';
import { WorkflowTickGuard } from '../../../../shared/application/guards/workflow-tick.guard.js';
import { TravelGroupsService } from '../../application/services/travel-groups.service.js';

/**
 * Internal workflow endpoints intended for external schedulers (EasyCron).
 *
 * These endpoints are NOT behind JWT/permissions auth. They are protected
 * by a shared secret (`x-workflow-tick-secret` header) configured via the
 * `WORKFLOW_TICK_SECRET` environment variable.
 *
 * The tick endpoint is idempotent and safe to call repeatedly. It finds
 * travel groups whose departure/return dates have arrived and transitions
 * their status automatically. Incomplete groups are left in their current
 * status and reported as warnings.
 */
@Controller('internal')
@UseGuards(WorkflowTickGuard)
export class InternalWorkflowController {
  constructor(private readonly travelGroups: TravelGroupsService) {}

  /**
   * Processes all due travel-group status transitions.
   *
   * Called by EasyCron (or any external scheduler) at a configured interval.
   *
   * @returns Summary of departed/completed groups and any warnings.
   */
  @Post('workflow/tick')
  async tick() {
    return this.travelGroups.processScheduledTransitions();
  }
}
