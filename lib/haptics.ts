/**
 * Tactile / haptic feedback for mobile and touch interactions.
 * Safe to call on any platform; silently no-ops when unsupported.
 */
export function triggerHaptic(
    type: 'light' | 'medium' | 'heavy' | 'success' | 'double' = 'light',
) {
    if (typeof window === 'undefined') return;
    try {
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
            switch (type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(22);
                    break;
                case 'heavy':
                    navigator.vibrate(36);
                    break;
                case 'success':
                    navigator.vibrate([15, 30, 20]);
                    break;
                case 'double':
                    navigator.vibrate([12, 28, 16]);
                    break;
            }
        }
    } catch {
        // Silently ignore browser permission errors or background limits
    }
}
