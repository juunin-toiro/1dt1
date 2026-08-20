import { useStoryStore } from './storyStore'

// pauseBeat() kann den Loreline-Interpreter selbst nicht anhalten (die dafuer
// noetige interne Async-Klasse ist nicht Teil der oeffentlichen API). Deshalb
// merkt sich pauseBeat hier nur, wie lange die NAECHSTE Dialogzeile verzoegert
// angezeigt werden soll - useLoreline.ts liest das beim naechsten onDialogue.
let pendingPauseMs: number | null = null

export function markPause(seconds: number): void {
  pendingPauseMs = Math.max(0, seconds) * 1000
}

export function consumePendingPause(): number | null {
  const value = pendingPauseMs
  pendingPauseMs = null
  return value
}

// Tippdauer des Typewriter-Effekts: zeichenbasiert statt wortbasiert, damit
// die Animation bei jeder Zeilenlaenge gleichmaessig schnell wirkt.
const MS_PER_CHAR = 20
const MIN_TYPING_MS = 350
const MAX_TYPING_MS = 3200

export function computeTypingDurationMs(text: string): number {
  const charCount = Array.from(text.trim()).length
  return Math.min(MAX_TYPING_MS, Math.max(MIN_TYPING_MS, charCount * MS_PER_CHAR))
}

// Kurze Pause NACH dem fertigen Tippen, bevor automatisch zur naechsten Zeile
// gesprungen wird - genug Zeit, um den Satz noch wahrzunehmen, aber bewusst
// kurz statt an die Textlaenge gekoppelt.
export const ADVANCE_BUFFER_MS = 450

// Die aktuell laufende Wartezeit (siehe skippableWait) - erlaubt dem
// sichtbaren `>>>`-Skip-Button, sowohl einen pauseBeat()-Delay als auch die
// Auto-Advance-Pufferzeit nach dem Tippen sofort zu beenden, egal welche der
// beiden gerade aktiv ist. Es kann immer nur eine Wartezeit gleichzeitig
// laufen (die zwei Wartepunkte in useLoreline.ts sind sequentiell, nie
// parallel), ein einzelner Slot reicht deshalb aus.
let activeWait: { resolve: () => void } | null = null

export function skipCurrentWait(): void {
  activeWait?.resolve()
}

// Wartet `ms` Millisekunden, reagiert dabei auf ein Abbruchsignal (Unmount)
// und kann jederzeit von aussen per skipCurrentWait() sofort beendet werden.
// Waehrend der Wartezeit steht `isWaiting` im Store auf true, damit die UI
// (StoryPlayer) den Skip-Button auch ausserhalb des Typewriter-Effekts zeigen
// kann - naemlich genau dann, wenn eine solche Wartezeit laeuft.
export function skippableWait(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearInterval(interval)
      if (activeWait === controller) activeWait = null
      useStoryStore.getState().setWaiting(false)
      resolve()
    }
    const controller = { resolve: finish }
    activeWait = controller
    useStoryStore.getState().setWaiting(true)

    const tick = 100
    let remaining = ms
    const interval = setInterval(() => {
      if (isCancelled()) {
        finish()
        return
      }
      remaining -= tick
      if (remaining <= 0) finish()
    }, tick)
  })
}
