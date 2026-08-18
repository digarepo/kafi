import { getPerformanceMode, type PerformanceMode } from './performance-mode';

type ResourceKind =
  'DOCUMENT' | 'JS' | 'CSS' | 'IMAGE' | 'FONT' | 'API' | 'OTHER';

type ResourceRecord = {
  name: string;
  kind: ResourceKind;
  initiatorType: string;
  startTime: number;
  duration: number;
  status?: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  cacheStatus: string;
};

type ApiRecord = {
  requestId: string;
  endpoint: string;
  method: string;
  route: string;
  timestamp?: string;
  startTime: number;
  duration: number;
  status?: number;
  retryCount: number;
  authRefreshCount: number;
  attempts?: number;
  initiator?: string;
  requestBytes?: number;
  responseBytes?: number;
  aborted: boolean;
};

type PerformanceSnapshot = {
  mode: PerformanceMode;
  capturedAt: string;
  route: string;
  navigation: PerformanceNavigationTiming | null;
  paints: Record<string, number>;
  largestContentfulPaint: number | null;
  cumulativeLayoutShift: number;
  totalLongTaskDuration: number;
  longTaskCount: number;
  api: ApiRecord[];
  resources: ResourceRecord[];
  routeMarks: Array<{ route: string; time: number }>;
};

type KafiPerformanceApi = {
  mode: PerformanceMode;
  recordApi: (record: ApiRecord) => void;
  snapshot: () => PerformanceSnapshot;
  clear: () => void;
  print: () => PerformanceSnapshot;
};

declare global {
  interface Window {
    __KAFI_PERF__?: KafiPerformanceApi;
    __KAFI_PERF_API_BUFFER__?: ApiRecord[];
  }
}

const performanceMode = getPerformanceMode(
  import.meta.env.VITE_KAFI_PERF_MODE,
  import.meta.env.VITE_KAFI_PERF_INSTRUMENTATION,
);
const apiRecords: ApiRecord[] = [];
const routeMarks: Array<{ route: string; time: number }> = [];
const resourceRecords = new Map<string, ResourceRecord>();
const paints: Record<string, number> = {};
let largestContentfulPaint: number | null = null;
let cumulativeLayoutShift = 0;
let totalLongTaskDuration = 0;
let longTaskCount = 0;

function classifyResource(entry: PerformanceResourceTiming): ResourceKind {
  const url = entry.name.split('?')[0].toLowerCase();
  if (
    entry.initiatorType === 'fetch' ||
    entry.initiatorType === 'xmlhttprequest'
  ) {
    return 'API';
  }
  if (entry.initiatorType === 'navigation') return 'DOCUMENT';
  if (entry.initiatorType === 'script' || /\.(js|mjs)$/.test(url)) return 'JS';
  if (entry.initiatorType === 'link' || /\.css$/.test(url)) return 'CSS';
  if (
    entry.initiatorType === 'img' ||
    /\.(avif|gif|jpe?g|png|webp|svg)$/.test(url)
  ) {
    return 'IMAGE';
  }
  if (entry.initiatorType === 'font' || /\.(woff2?|ttf|otf|eot)$/.test(url)) {
    return 'FONT';
  }
  return 'OTHER';
}

function cacheStatus(entry: PerformanceResourceTiming): string {
  if (entry.transferSize > 0) return 'network';
  if (entry.decodedBodySize > 0) return 'cached-or-cross-origin';
  return 'unknown';
}

function recordResource(entry: PerformanceResourceTiming) {
  const key = `${entry.name}:${entry.startTime}`;
  resourceRecords.set(key, {
    name: entry.name,
    kind: classifyResource(entry),
    initiatorType: entry.initiatorType,
    startTime: entry.startTime,
    duration: entry.duration,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
    cacheStatus: cacheStatus(entry),
  });
}

function markRoute() {
  routeMarks.push({
    route: window.location.pathname + window.location.search,
    time: performance.now(),
  });
}

function snapshot(): PerformanceSnapshot {
  return {
    mode: performanceMode,
    capturedAt: new Date().toISOString(),
    route: window.location.pathname + window.location.search,
    navigation:
      (performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined) ?? null,
    paints: { ...paints },
    largestContentfulPaint,
    cumulativeLayoutShift,
    totalLongTaskDuration,
    longTaskCount,
    api: [...apiRecords],
    resources: [...resourceRecords.values()],
    routeMarks: [...routeMarks],
  };
}

function setupPerformanceObservers() {
  const resourceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      recordResource(entry as PerformanceResourceTiming);
    }
  });
  resourceObserver.observe({ type: 'resource', buffered: true });

  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) paints[entry.name] = entry.startTime;
  });
  paintObserver.observe({ type: 'paint', buffered: true });

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) largestContentfulPaint = last.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // The browser may not support LCP observation.
  }

  try {
    const layoutObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!shift.hadRecentInput) cumulativeLayoutShift += shift.value ?? 0;
      }
    });
    layoutObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // The browser may not support layout-shift observation.
  }

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        totalLongTaskDuration += entry.duration;
        longTaskCount += 1;
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // The browser may not support long-task observation.
  }
}

function installRouteMarks() {
  const historyMethods = ['pushState', 'replaceState'] as const;
  for (const method of historyMethods) {
    const original = window.history[method];
    window.history[method] = function (...args) {
      const result = original.apply(this, args);
      markRoute();
      return result;
    };
  }
  window.addEventListener('popstate', markRoute);
  markRoute();
}

if (typeof window !== 'undefined') {
  setupPerformanceObservers();
  installRouteMarks();

  const bufferedApiRecords = window.__KAFI_PERF_API_BUFFER__ ?? [];
  apiRecords.push(...bufferedApiRecords);
  delete window.__KAFI_PERF_API_BUFFER__;

  window.__KAFI_PERF__ = {
    mode: performanceMode,
    recordApi(record) {
      apiRecords.push(record);
    },
    snapshot,
    clear() {
      apiRecords.length = 0;
      routeMarks.length = 0;
      resourceRecords.clear();
      for (const key of Object.keys(paints)) delete paints[key];
      largestContentfulPaint = null;
      cumulativeLayoutShift = 0;
      totalLongTaskDuration = 0;
      longTaskCount = 0;
    },
    print() {
      const value = snapshot();
      console.table(value.api);
      console.table(value.resources);
      console.info('[kafi-perf] snapshot', value);
      return value;
    },
  };

  if (performanceMode === 'VERBOSE') {
    console.info(
      '[kafi-perf] VERBOSE mode enabled; use window.__KAFI_PERF__.print() for a snapshot',
    );
  }
}

export {};
