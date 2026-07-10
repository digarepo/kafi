/**
 * Trigger subtle haptic feedback on supported devices.
 * Safe to call anywhere.
 */
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
