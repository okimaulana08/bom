/**
 * Safe mobile haptic vibration feedback utility.
 * Gracefully no-ops on browsers/devices without navigator.vibrate (e.g. desktop / iOS Safari).
 * Respects the user's audio/feedback preference in profileStore when checked by caller,
 * or always stays subtle and non-throwing.
 */
import { useProfileStore } from '../store/profileStore';

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    // Respect sound toggle so muted mode is genuinely quiet/discreet on mobile
    if (!useProfileStore.getState().soundEnabled) return;
    navigator.vibrate(pattern);
  } catch {
    // Ignore permission or browser intervention errors
  }
}

export const haptics = {
  /** Crisp micro-tap for UI buttons, tabs, filter pills */
  tap: () => vibrate(10),
  /** Tactile select pulse for picking a card or slot */
  cardSelect: () => vibrate(16),
  /** Long-press zoom lock-in pulse */
  longPress: () => vibrate([12, 24, 18]),
  /** Monster summon slam */
  summon: (isAce = false) => vibrate(isAce ? [24, 30, 42] : 22),
  /** Standard attack or trap activation */
  impact: () => vibrate([20, 20, 28]),
  /** Heavy/critical/lethal impact, Fusion, or Maximum Summon */
  heavyImpact: () => vibrate([35, 25, 55, 25, 45]),
  /** Foil pack rip tick as user swipes across the tear strip */
  packTick: () => vibrate(12),
  /** Victory / reward claim fanfare pulse */
  victory: () => vibrate([25, 40, 35, 40, 65]),
};
