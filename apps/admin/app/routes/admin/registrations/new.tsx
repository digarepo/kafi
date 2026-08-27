import { RegistrationCreatePage } from "@/features/travellers";
import { RequirePermission } from "../../../core/permissions";

export function meta() {
  return [{ title: "Create registration | Kafi Admin" }];
}

export default function RegistrationNewRoute() {
  return (
    <RequirePermission permission="REGISTRATION_CREATE">
      <RegistrationCreatePage />
    </RequirePermission>
  );
}
