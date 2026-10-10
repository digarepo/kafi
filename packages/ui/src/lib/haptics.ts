/**
 * Trigger subtle haptic feedback on supported devices.
 * Safe to call anywhere.
 */
export function haptic(pattern: number | number[] = 10) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('[haptic] vibration failed:', error);
  }
}
