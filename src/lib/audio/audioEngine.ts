// Schlanke Audio-Engine ueber HTMLAudioElement. Ziel: die App darf nie
// abstuerzen oder haengen bleiben, egal ob eine echte Datei existiert oder
// nicht — deshalb faellt jeder Sound-/Ambience-Aufruf bei einem Ladefehler
// automatisch auf eine stille Platzhalterdatei zurueck.
//
// Dateikonvention fuer spaetere echte Assets:
//   Sounds:    public/audio/sfx/<name>.mp3
//   Ambiences: public/audio/ambience/<name>.mp3
// Existiert eine solche Datei nicht, greift der Platzhalter automatisch.

const DEFAULT_SOUND_URL = '/audio/click.wav'
const DEFAULT_AMBIENCE_URL = '/audio/morning-room.wav'

let audioUnlocked = false
const pendingActions: Array<() => void> = []

function unlockAudio() {
  if (audioUnlocked) return
  audioUnlocked = true
  const queued = pendingActions.splice(0)
  queued.forEach((action) => action())
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'keydown'] as const
  const handleFirstInteraction = () => {
    unlockAudio()
    unlockEvents.forEach((event) => window.removeEventListener(event, handleFirstInteraction))
  }
  unlockEvents.forEach((event) => window.addEventListener(event, handleFirstInteraction))
}

function runOrQueue(action: () => void) {
  if (audioUnlocked) {
    action()
  } else {
    pendingActions.push(action)
  }
}

function playWithFallback(primaryUrl: string, fallbackUrl: string, options: { loop?: boolean } = {}) {
  const audio = new Audio(primaryUrl)
  audio.loop = Boolean(options.loop)

  audio.addEventListener(
    'error',
    () => {
      if (audio.src.endsWith(fallbackUrl)) return
      console.warn(`[audio] Datei nicht gefunden, nutze Platzhalter: ${primaryUrl}`)
      const fallback = new Audio(fallbackUrl)
      fallback.loop = Boolean(options.loop)
      fallback.play().catch((err) => console.warn('[audio] Platzhalter konnte nicht abgespielt werden', err))
      if (options.loop) {
        currentAmbience = fallback
      }
    },
    { once: true },
  )

  audio.play().catch((err) => {
    // Meist Autoplay-Restriktion trotz Unlock-Versuch — nicht fatal.
    console.warn(`[audio] Wiedergabe blockiert: ${primaryUrl}`, err)
  })

  return audio
}

export function playSound(name: string): void {
  runOrQueue(() => {
    playWithFallback(`/audio/sfx/${name}.mp3`, DEFAULT_SOUND_URL)
  })
}

let currentAmbience: HTMLAudioElement | null = null
let currentAmbienceName: string | null = null

export function playAmbience(name: string, loop = true): void {
  runOrQueue(() => {
    if (currentAmbienceName === name) return
    stopAmbience()
    currentAmbienceName = name
    currentAmbience = playWithFallback(`/audio/ambience/${name}.mp3`, DEFAULT_AMBIENCE_URL, { loop })
  })
}

export function stopAmbience(): void {
  if (currentAmbience) {
    currentAmbience.pause()
    currentAmbience.currentTime = 0
  }
  currentAmbience = null
  currentAmbienceName = null
}
