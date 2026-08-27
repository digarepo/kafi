import { useParams } from "react-router";
import { TravellerEditPage } from "@/features/travellers";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Edit traveller | Kafi Admin" }];
}

export default function TravellerEditRoute() {
  const { id } = useParams();
  if (!id) throw new Error("Missing traveller id");
  return (
    <RequirePermission permission="TRAVELLER_EDIT">
      <TravellerEditPage id={id} />
    </RequirePermission>
  );
}
