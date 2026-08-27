import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { Dialog, DialogContent, cn } from '@kafi/ui';

import { usePermissions } from '../../core/permissions';
import { api, type SearchHit, type SearchResults } from '../../lib/api.js';

/**
 * Minimum characters before a search request is fired.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Debounce delay (ms) before firing a search request after typing stops.
 */
const DEBOUNCE_MS = 250;

/**
 * Entity group metadata — order controls display order in the dialog.
 *
 * `permission` is checked client-side as an early-out so we never render a
 * group the user can't access. The server enforces the same check, so this
 * is defence-in-depth, not the sole gate.
 */
const GROUPS: {
  key: keyof Omit<SearchResults, 'query'>;
  label: string;
  permission: string;
}[] = [
  { key: 'travellers', label: 'Travellers', permission: 'TRAVELLER_VIEW' },
  {
    key: 'registrations',
    label: 'Registrations',
    permission: 'REGISTRATION_VIEW',
  },
  {
    key: 'travel_groups',
    label: 'Travel Groups',
    permission: 'TRAVEL_GROUP_VIEW',
  },
  { key: 'inquiries', label: 'Inquiries', permission: 'INQUIRY_VIEW' },
  { key: 'packages', label: 'Packages', permission: 'PACKAGE_VIEW' },
  { key: 'invoices', label: 'Invoices', permission: 'FINANCE_VIEW' },
  { key: 'payments', label: 'Payments', permission: 'FINANCE_VIEW' },
];

/**
 * Flattens grouped results into a single ordered list for keyboard
 * navigation. Only groups the user has permission to see are included.
 */
function flattenResults(
  results: SearchResults | null,
  can: (perm: string) => boolean,
): SearchHit[] {
  if (!results) return [];
  const hits: SearchHit[] = [];
  for (const group of GROUPS) {
    if (!can(group.permission)) continue;
    const items = results[group.key];
    if (items?.length) hits.push(...items);
  }
  return hits;
}

/**
 * Cross-entity operational search command palette.
 *
 * A search icon button in the header opens a centered dialog (on both mobile
 * and desktop) containing the search input and grouped results.
 *
 * Behaviour:
 * - Debounced server-side search via `GET /api/admin/search?q=`
 * - Minimum 2 characters before searching
 * - Results grouped by entity with secondary metadata
 * - Arrow-key navigation + Enter to open + Escape to close
 * - Loading, empty, and no-results states
 * - Permission-aware — groups the user can't see are never rendered
 */
export function GlobalSearch() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // ---- Search effect (debounced) ----

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const data = await api.globalSearch(trimmed);
        // Ignore stale responses from superseded requests.
        if (requestIdRef.current === id) {
          setResults(data);
          setActiveIndex(-1);
        }
      } catch {
        if (requestIdRef.current === id) {
          setResults(null);
        }
      } finally {
        if (requestIdRef.current === id) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // ---- Flat list for keyboard nav ----

  const flatHits = useMemo(() => flattenResults(results, can), [results, can]);

  const totalHits = flatHits.length;

  // ---- Navigation ----

  const openHit = useCallback(
    (hit: SearchHit | undefined) => {
      if (!hit) return;
      setOpen(false);
      setQuery('');
      setResults(null);
      setActiveIndex(-1);
      navigate(hit.href);
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (totalHits === 0) return;
        setActiveIndex((i) => (i + 1) % totalHits);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (totalHits === 0) return;
        setActiveIndex((i) => (i - 1 + totalHits) % totalHits);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < totalHits) {
          e.preventDefault();
          openHit(flatHits[activeIndex]);
        }
      }
    },
    [totalHits, activeIndex, flatHits, openHit],
  );

  // ---- Focus input + reset on open/close ----

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    // Reset state when dialog closes.
    setQuery('');
    setResults(null);
    setActiveIndex(-1);
  }, [open]);

  const hasAnyResults = totalHits > 0;

  // ---- Results rendering ----

  const renderResults = () => {
    let runningIndex = -1;

    return (
      <div className="max-h-[60dvh] overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <Spinner />
            Searching…
          </div>
        )}

        {!loading && !hasAnyResults && results !== null && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results for “{results.query}”.
          </div>
        )}

        {!loading && !hasAnyResults && results === null && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Start typing to search across travellers, registrations, groups,
            invoices, and more.
          </div>
        )}

        {!loading &&
          hasAnyResults &&
          GROUPS.map((group) => {
            if (!can(group.permission)) return null;
            const items = results?.[group.key];
            if (!items?.length) return null;

            return (
              <div key={group.key} className="py-1">
                <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {items.map((hit) => {
                  runningIndex++;
                  const idx = runningIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <ResultRow
                      key={`${group.key}-${hit.id}`}
                      hit={hit}
                      active={isActive}
                      onSelect={() => openHit(hit)}
                      onHover={() => setActiveIndex(idx)}
                    />
                  );
                })}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <>
      {/* Trigger — search icon button, visible on all breakpoints */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Centered dialog — same experience on mobile and desktop */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-1/2 max-w-lg -translate-y-1/2 gap-0 p-0"
        >
          {/* Search input bar */}
          <div className="flex items-center gap-2 border-b p-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Search travellers, registrations, groups…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/10"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Grouped results */}
          {renderResults()}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Sub-components ----

function ResultRow({
  hit,
  active,
  onSelect,
  onHover,
}: {
  hit: SearchHit;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-accent/10' : 'hover:bg-accent/5',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{hit.label}</span>
        {hit.secondary && (
          <span className="block truncate text-xs text-muted-foreground">
            {hit.secondary}
          </span>
        )}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
      aria-hidden
    />
  );
}
