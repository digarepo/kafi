import { useEffect, useRef } from 'react';

export type RenderProfileEntry = {
  count: number;
  totalCommitDurationMs: number;
  maxCommitDurationMs: number;
  rowModelDurationMs: number;
  rowModelRows: number;
};

type RenderProfileWindow = Window & {
  __KAFI_RENDER_PROFILE__?: Record<string, RenderProfileEntry>;
};

export function recordRender(
  name: string,
  commitDurationMs: number,
  rowModelDurationMs = 0,
  rowModelRows = 0,
) {
  if (typeof window === 'undefined') return;
  const renderWindow = window as RenderProfileWindow;
  const entries = (renderWindow.__KAFI_RENDER_PROFILE__ ??= {});
  const current = entries[name] ?? {
    count: 0,
    totalCommitDurationMs: 0,
    maxCommitDurationMs: 0,
    rowModelDurationMs: 0,
    rowModelRows: 0,
  };
  current.count += 1;
  current.totalCommitDurationMs += commitDurationMs;
  current.maxCommitDurationMs = Math.max(
    current.maxCommitDurationMs,
    commitDurationMs,
  );
  current.rowModelDurationMs += rowModelDurationMs;
  current.rowModelRows = Math.max(current.rowModelRows, rowModelRows);
  entries[name] = current;
}

export function useRenderProfile(name: string) {
  const startedAt = useRef(performance.now());
  useEffect(() => {
    recordRender(name, performance.now() - startedAt.current);
    startedAt.current = performance.now();
  });
}
