import { ulid } from 'ulid';

export const TRAVEL_GROUP_DEPARTED_EVENT = 'operations.travel-group.departed';

export interface TravelGroupDepartedEventPayload {
  id: string;
  travel_group_id: string;
  group_number: string;
  departed_at: string;
}

export function createTravelGroupDepartedEvent(
  payload: Omit<TravelGroupDepartedEventPayload, 'id'>,
) {
  return {
    id: ulid(),
    type: TRAVEL_GROUP_DEPARTED_EVENT,
    payload: {
      ...payload,
    },
  };
}
