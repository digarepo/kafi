import { Button, Card, CardContent, CardHeader, CardTitle } from "@kafi/ui";
import type { Traveller } from "../../../lib/api.js";
import { usePermissions } from "../../../core/permissions";
import { useNavigate } from "react-router";

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

interface TravellerDetailCardProps {
  traveller: Traveller;
  onArchive?: (id: string) => Promise<void>;
}

export function TravellerDetailCard({ traveller, onArchive }: TravellerDetailCardProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle>
          {traveller.first_name} {traveller.middle_name ?? ""} {traveller.last_name}
        </CardTitle>
        <div className="flex gap-2">
          {can("TRAVELLER_EDIT") && (
            <Button variant="outline" onClick={() => navigate(`/travellers/${traveller.id}/edit`)}>
              Edit
            </Button>
          )}
          {can("TRAVELLER_DELETE") && onArchive && (
            <Button variant="destructive" onClick={() => void onArchive(traveller.id)}>
              Archive
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Traveller number</p>
          <p className="font-medium">{traveller.traveller_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone number</p>
          <p className="font-medium">{traveller.phone_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{traveller.email_address ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date of birth</p>
          <p className="font-medium">{formatDateOnly(traveller.date_of_birth)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gender</p>
          <p className="font-medium">{traveller.gender ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Country</p>
          <p className="font-medium">{traveller.country?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Source</p>
          <p className="font-medium">{traveller.source?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{traveller.status?.name ?? "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
