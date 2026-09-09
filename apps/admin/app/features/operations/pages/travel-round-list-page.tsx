import { useEffect, useState } from 'react';
import { api, type TravelRound } from '../../../lib/api.js';

/** Admin list for monitoring travel-round lifecycle and intake sequence. */
export function TravelRoundListPage() {
  const [rounds, setRounds] = useState<TravelRound[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.listTravelRounds({ page: 1, page_size: 100 }).then((result) => setRounds(result.data)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load travel rounds')); }, []);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Travel rounds</h1><p className="text-sm text-muted-foreground">Manage the package → round → registration intake boundary.</p></div>{error && <p className="text-sm text-destructive">{error}</p>}<div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-left"><th className="p-3">Round</th><th className="p-3">Dates</th><th className="p-3">Status</th><th className="p-3">Next registration</th></tr></thead><tbody>{rounds.map((round) => <tr key={round.id} className="border-b last:border-0"><td className="p-3 font-medium">R{String(round.round_number).padStart(2, '0')} — {round.name}</td><td className="p-3">{String(round.departure_date).slice(0, 10)} – {String(round.return_date).slice(0, 10)}</td><td className="p-3">{round.status}</td><td className="p-3">{round.next_registration_sequence}</td></tr>)}</tbody></table></div></div>;
}
