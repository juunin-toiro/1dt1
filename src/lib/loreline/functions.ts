import type { Interpreter } from 'loreline'
import { playAmbience, playSound } from '../audio/audioEngine'
import { haptics } from '../haptics/haptics'
import { markPause } from './pacing'
import { normalizeTrend, useStoryStore } from './storyStore'

type ExternalFunction = (interp: Interpreter, args: unknown[]) => unknown

const HYPO_THRESHOLD = 4

// Adapter zwischen den externen Funktionen aus one-day.lor und der React-Welt.
// logDecision ist noch ein Logging-Stub. playSound/playAmbience laufen echt
// ueber die Audio-Engine (mit Platzhalter-Fallback, siehe lib/audio/audioEngine.ts).
// applyEffect/setCurve/revealDayCurve/unlockKnowledge schreiben in den echten
// Story-Store. pauseBeat kann den Interpreter nicht selbst anhalten (siehe
// pacing.ts) - es merkt nur vor, wie lange useLoreline die naechste Zeile
// verzoegert anzeigen soll.
export const lorelineFunctions: Record<string, ExternalFunction> = {
  playSound: (_interp, [name, caption]) => {
    playSound(String(name))
    if (caption) useStoryStore.getState().setCaption(String(caption))
  },
  playAmbience: (_interp, [name, loop, caption]) => {
    playAmbience(String(name), Boolean(loop))
    if (caption) useStoryStore.getState().setCaption(String(caption))
  },
  applyEffect: (_interp, [type, magnitude, delaySeconds]) => {
    useStoryStore.getState().applyEffect(String(type), Number(magnitude), Number(delaySeconds))
  },
  setCurve: (_interp, [value, trend, zeit]) => {
    const numericValue = Number(value)
    useStoryStore.getState().setCurve(numericValue, normalizeTrend(trend), String(zeit))
    if (numericValue < HYPO_THRESHOLD) {
      haptics.warning()
    }
  },
  logDecision: (_interp, [id]) => {
    console.log(`[decision] ${id}`)
  },
  pauseBeat: (_interp, [seconds]) => {
    markPause(Number(seconds))
  },
  revealDayCurve: () => {
    useStoryStore.getState().revealCurve()
    haptics.reveal()
  },
  unlockKnowledge: (_interp, [id, title, text]) => {
    useStoryStore.getState().unlockKnowledge(String(id), String(title), String(text))
  },
  offerShare: () => {
    offerShare()
  },
}

// Platzhalter: nutzt die native Web Share API, wo verfuegbar (v.a. mobil).
// Ohne Unterstuetzung (z.B. Desktop Firefox) nur ein Log, kein Crash.
// Spaeter ggf. durch eine eigene Share-Karte/Dialog ersetzbar.
// Eigenstaendig exportiert, damit das Dev-Panel es unabhaengig testen kann.
export function offerShare(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    navigator
      .share({
        title: 'One Day',
        text: 'Ich habe gerade einen Tag mit Typ-1-Diabetes erlebt.',
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      })
      .catch((err) => {
        console.warn('[share] abgebrochen oder fehlgeschlagen', err)
      })
  } else {
    console.log('[share] Web Share API nicht verfuegbar (Platzhalter)')
  }
}
