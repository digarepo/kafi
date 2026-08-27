import { TravelGroupCreatePage } from "@/features/operations";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Create travel group | Kafi Admin" }];
}

export default function TravelGroupNewRoute() {
  return (
    <RequirePermission permission="TRAVEL_GROUP_MANAGE">
      <TravelGroupCreatePage />
    </RequirePermission>
  );
}
