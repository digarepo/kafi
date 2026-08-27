import { ulid } from 'ulid';

export const TRAVEL_GROUP_COMPLETED_EVENT = 'operations.travel-group.completed';

export interface TravelGroupCompletedEventPayload {
  id: string;
  travel_group_id: string;
  group_number: string;
  completed_at: string;
  registration_ids: string[];
}

export function createTravelGroupCompletedEvent(
  payload: Omit<TravelGroupCompletedEventPayload, 'id'>,
) {
  return {
    id: ulid(),
    type: TRAVEL_GROUP_COMPLETED_EVENT,
    payload: {
      ...payload,
    },
  };
}
