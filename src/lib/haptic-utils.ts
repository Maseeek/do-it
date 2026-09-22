// Haptic Feedback Engine for mobile browsers (PWA support)

export function hapticLight() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12);
    } catch {
      // Haptics unsupported or blocked
    }
  }
}

export function hapticMedium() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(25);
    } catch {
      // Haptics unsupported or blocked
    }
  }
}

export function hapticSuccess() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([15, 30, 20]);
    } catch {
      // Haptics unsupported or blocked
    }
  }
}

export function hapticCelebration() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([20, 30, 25, 30, 40]);
    } catch {
      // Haptics unsupported or blocked
    }
  }
}
