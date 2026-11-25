import { Loader } from 'lucide-react';

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-16 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
