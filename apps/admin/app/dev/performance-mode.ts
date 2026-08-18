export type PerformanceMode = 'OFF' | 'CAPTURE' | 'VERBOSE';

export function getPerformanceMode(
  configuredMode?: string,
  legacyEnabled?: string,
): PerformanceMode {
  const configured = (configuredMode ?? '').trim().toUpperCase();
  if (configured === 'CAPTURE' || configured === 'VERBOSE') {
    return configured;
  }
  if (legacyEnabled === 'true') return 'CAPTURE';
  return 'OFF';
}
