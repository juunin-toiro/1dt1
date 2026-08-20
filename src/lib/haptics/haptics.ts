// Haptik als reines Progressive Enhancement. navigator.vibrate existiert nur
// auf einem Teil der mobilen Browser (v.a. Android Chrome) — ueberall sonst
// (Desktop, iOS Safari) ist das ein No-Op, nie ein Fehler.
type VibratePattern = number | number[]

function vibrate(pattern: VibratePattern): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

export const haptics = {
  choiceTap: () => vibrate(10),
  reveal: () => vibrate([15, 40, 15]),
  warning: () => vibrate([30, 30, 30, 30, 60]),
}
