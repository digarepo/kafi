import { useParams } from "react-router";
import { RegistrationEditPage } from "@/features/travellers";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Edit registration | Kafi Admin" }];
}

export default function RegistrationEditRoute() {
  const { id } = useParams();
  if (!id) throw new Error("Missing registration id");
  return (
    <RequirePermission permission="REGISTRATION_EDIT">
      <RegistrationEditPage id={id} />
    </RequirePermission>
  );
}
