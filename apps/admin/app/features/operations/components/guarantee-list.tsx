import { useEffect, useState } from "react";
import { Button } from "@kafi/ui";
import { api, type Guarantee, type GroupMembership } from "../../../lib/api.js";
import { displayDate } from "../lib/date";

interface GuaranteeListProps {
  membership: GroupMembership;
  canManage: boolean;
  onReplace: (g: Guarantee) => void;
  onChanged: () => void;
}

export function GuaranteeList({ membership, canManage, onReplace, onChanged }: GuaranteeListProps) {
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await api.listGuarantees(membership.id);
        if (!cancelled) setGuarantees(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load guarantees");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [membership.id]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this guarantee?")) return;
    try {
      await api.deleteGuarantee(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading guarantees…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  if (guarantees.length === 0) {
    return <p className="text-muted-foreground text-sm">No guarantees recorded.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Number</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Amount</th>
            <th className="px-3 py-2 text-left font-medium">Effective</th>
            <th className="px-3 py-2 text-left font-medium">Expiry</th>
            {canManage && <th className="px-3 py-2 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {guarantees.map((g) => (
            <tr key={g.id} className="border-t">
              <td className="px-3 py-2">{g.guarantee_number}</td>
              <td className="px-3 py-2">{g.guarantee_type}</td>
              <td className="px-3 py-2">{g.guarantee_status}</td>
              <td className="px-3 py-2">
                {g.amount ? `${g.amount} ${g.currency?.code ?? ""}` : "-"}
              </td>
              <td className="px-3 py-2">{displayDate(g.effective_date)}</td>
              <td className="px-3 py-2">{displayDate(g.expiry_date)}</td>
              {canManage && (
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReplace(g)}
                    disabled={
                      g.guarantee_status === "REPLACED" || g.guarantee_status === "REFUNDED"
                    }
                  >
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(g.id)}
                    disabled={g.guarantee_status === "ACTIVE" || g.guarantee_status === "REPLACED"}
                  >
                    Delete
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
