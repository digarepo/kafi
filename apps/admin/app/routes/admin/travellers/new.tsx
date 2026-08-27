import { TravellerCreatePage } from "@/features/travellers";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Create traveller | Kafi Admin" }];
}

export default function TravellerNewRoute() {
  return (
    <RequirePermission permission="TRAVELLER_CREATE">
      <TravellerCreatePage />
    </RequirePermission>
  );
}
