import { TravelGroupEditPage } from "@/features/operations";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Edit travel group | Kafi Admin" }];
}

export default function TravelGroupEditRoute() {
  return (
    <RequirePermission permission="TRAVEL_GROUP_MANAGE">
      <TravelGroupEditPage />
    </RequirePermission>
  );
}
