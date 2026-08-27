import { useId, useState } from 'react';
import { Button, cn } from '@kafi/ui';

import { ReadinessBlockers, type ReadinessItem } from './readiness-blockers';
import {
  WorkflowConfirmationDialog,
  type WorkflowCommand,
} from './workflow-confirmation-dialog';
import { WorkflowStatusBadge, type WorkflowEntity } from './workflow-status';

export interface WorkflowActionGuard {
  allowed: boolean;
  blockers?: ReadinessItem[];
}

interface ContextualActionBarProps {
  entity: WorkflowEntity;
  status: string | null | undefined;
  can: (permission: string) => boolean;
  guards?: Partial<Record<WorkflowCommand, WorkflowActionGuard>>;
  onCommand?: Partial<
    Record<WorkflowCommand, (reason?: string) => void | Promise<void>>
  >;
  readinessItems?: ReadinessItem[];
  className?: string;
}

const registrationCommands: Record<string, WorkflowCommand | null> = {
  DRAFT: 'start-processing',
  PROCESSING: 'confirm-ready',
};

const travelGroupCommands: Record<string, WorkflowCommand | null> = {
  PLANNING: 'confirm-travel-prepared',
  // DEPARTED and COMPLETED transitions are now automatic based on
  // the travel group's departure_date and return_date. No manual
  // button is shown for TRAVEL_PREPARED or DEPARTED states.
};

function getPrimaryCommand(
  entity: WorkflowEntity,
  status: string | null | undefined,
): WorkflowCommand | null {
  if (!status) return null;
  return (
    (entity === 'registration' ? registrationCommands : travelGroupCommands)[
      status
    ] ?? null
  );
}

function canRunCommand(
  command: WorkflowCommand,
  can: (permission: string) => boolean,
): boolean {
  return can(
    command === 'start-processing' ||
      command === 'confirm-ready' ||
      command === 'cancel-registration'
      ? 'REGISTRATION_EDIT'
      : 'TRAVEL_GROUP_MANAGE',
  );
}

function isRegistrationCancellable(status: string | null | undefined): boolean {
  return (
    status === 'DRAFT' ||
    status === 'PROCESSING' ||
    status === 'READY_FOR_TRAVEL'
  );
}

export function getContextualWorkflowCommand(
  entity: WorkflowEntity,
  status: string | null | undefined,
): WorkflowCommand | null {
  return getPrimaryCommand(entity, status);
}

export function ContextualActionBar({
  entity,
  status,
  can,
  guards = {},
  onCommand = {},
  readinessItems,
  className,
}: ContextualActionBarProps) {
  const titleId = useId();
  const [activeCommand, setActiveCommand] = useState<WorkflowCommand | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryCommand = getPrimaryCommand(entity, status);
  const cancelCommand: WorkflowCommand | null =
    entity === 'registration' && isRegistrationCancellable(status)
      ? 'cancel-registration'
      : null;
  const visibleCommands = [primaryCommand, cancelCommand].filter(
    (command): command is WorkflowCommand =>
      command !== null &&
      canRunCommand(command, can) &&
      typeof onCommand[command] === 'function',
  );

  const primaryGuard = primaryCommand ? guards[primaryCommand] : undefined;
  const isPrimaryBlocked = primaryGuard?.allowed === false;

  const allReady =
    readinessItems !== undefined &&
    readinessItems.length > 0 &&
    readinessItems.every((item) => item.status === 'satisfied');

  // Don't hide when there are readiness items to show, even if no commands
  if (visibleCommands.length === 0 && !readinessItems) return null;

  async function handleConfirm(reason?: string) {
    if (!activeCommand) return;
    const handler = onCommand[activeCommand];
    if (!handler) return;

    setLoading(true);
    setError(null);
    try {
      await handler(reason);
      setActiveCommand(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  function openCommand(command: WorkflowCommand) {
    setError(null);
    setActiveCommand(command);
  }

  return (
    <>
      <section
        className={cn('space-y-3 rounded-lg border p-4', className)}
        aria-labelledby={titleId}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-medium">
              Next action
            </h2>
            <p className="text-sm text-muted-foreground">
              {allReady
                ? "You're all set — all readiness checks are complete."
                : isPrimaryBlocked
                  ? 'Resolve the items below to proceed.'
                  : 'Available workflow command for the current state.'}
            </p>
          </div>
          <WorkflowStatusBadge status={status} />
        </div>

        {readinessItems && readinessItems.length > 0 && (
          <ReadinessBlockers
            title={isPrimaryBlocked ? 'Action blocked' : 'Readiness'}
            items={readinessItems}
            emptyTitle="Action is not available"
            emptyDescription="The backend has not marked this workflow command as available yet."
          />
        )}

        {!isPrimaryBlocked && primaryCommand && onCommand[primaryCommand] && (
          <Button onClick={() => openCommand(primaryCommand)}>
            {getCommandLabel(primaryCommand)}
          </Button>
        )}

        {cancelCommand && onCommand[cancelCommand] && (
          <Button variant="outline" onClick={() => openCommand(cancelCommand)}>
            Cancel registration
          </Button>
        )}
      </section>

      <WorkflowConfirmationDialog
        command={activeCommand}
        open={activeCommand !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCommand(null);
            setError(null);
          }
        }}
        onConfirm={handleConfirm}
        loading={loading}
        error={error}
      />
    </>
  );
}

function getCommandLabel(command: WorkflowCommand): string {
  switch (command) {
    case 'start-processing':
      return 'Start processing';
    case 'confirm-ready':
      return 'Confirm ready';
    case 'confirm-travel-prepared':
      return 'Confirm travel prepared';
    case 'depart':
      return 'Depart';
    case 'complete':
      return 'Complete';
    case 'cancel-registration':
      return 'Cancel registration';
  }
}
