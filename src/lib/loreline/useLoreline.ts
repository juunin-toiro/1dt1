import { useEffect, useRef, useState } from 'react'
import {
  Loreline,
  type ChoiceHandler,
  type ChoiceOption,
  type DialogueHandler,
  type FinishHandler,
  type Script,
  type TextTag,
} from 'loreline'
import { lorelineFunctions } from './functions'
import { ADVANCE_BUFFER_MS, computeTypingDurationMs, consumePendingPause, skippableWait } from './pacing'
import { useStoryStore } from './storyStore'

// Zeilen mit dem <knowledge>-Tag sind die einzige Ausnahme vom Autoplay:
// die "Mehr erfahren"-Inhalte bleiben bewusst klick-gesteuert. Alles andere
// laeuft standardmaessig automatisch weiter (Lesezeit ueber pacing.ts).
// Exportiert, damit StoryPlayer.tsx dieselbe Zeile erkennen kann, um sie
// als Wissens-Modal statt als normale Log-Zeile darzustellen.
export const MANUAL_ADVANCE_TAG = 'knowledge'

export interface LorelineLine {
  character: string | null
  text: string
  tags: TextTag[]
}

export type LorelineChoice = ChoiceOption

export interface UseLorelineResult {
  line: LorelineLine | null
  choices: LorelineChoice[] | null
  awaitingManualAdvance: boolean
  finished: boolean
  loading: boolean
  error: string | null
  advance: () => void
  choose: (index: number) => void
}

export function useLoreline(scriptUrl: string, startBeat?: string): UseLorelineResult {
  const [line, setLine] = useState<LorelineLine | null>(null)
  const [choices, setChoices] = useState<LorelineChoice[] | null>(null)
  const [awaitingManualAdvance, setAwaitingManualAdvance] = useState(false)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const advanceRef = useRef<(() => void) | null>(null)
  const selectRef = useRef<((index: number) => void) | null>(null)
  // Ein manueller Klick auf "Weiter" ist selbst schon die Lesepause, die
  // pauseBeat() eigentlich geben soll (die Person hat gerade entschieden,
  // dass sie fertig ist) - eine zusaetzliche, unsichtbare Zwangspause danach
  // fuehlt sich nur wie ein Haenger an. Dieses Flag sorgt dafuer, dass genau
  // die naechste Enthuellung nach einem manuellen Advance eine wartende
  // Pause ueberspringt, ohne pauseBeat() fuer automatische Ablaeufe anzutasten.
  const skipNextPauseRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    fetch(scriptUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Konnte Skript nicht laden: ${res.status}`)
        }
        return res.text()
      })
      .then((content) => {
        if (cancelled) return

        const script: Script | null = Loreline.parse(content)
        if (!script) {
          throw new Error('Skript konnte nicht geparst werden')
        }

        const reveal = (character: string | null, text: string, tags: TextTag[], advance: () => void) => {
          if (cancelled) return

          // Ein manueller Klick auf "Weiter" (falls die Person nicht warten
          // will) und der automatische Lesezeit-Timer wollen beide irgendwann
          // advance() aufrufen - dieses Flag sorgt dafuer, dass nur der erste
          // von beiden tatsaechlich zaehlt.
          let alreadyAdvanced = false
          const advanceOnce = () => {
            if (alreadyAdvanced) return
            alreadyAdvanced = true
            advance()
          }

          const requiresManualAdvance = tags.some((tag) => tag.value === MANUAL_ADVANCE_TAG)

          setChoices(null)
          setLine({ character, text, tags })
          setAwaitingManualAdvance(requiresManualAdvance)
          advanceRef.current = advanceOnce

          if (character === 'lumi') {
            const moodTag = tags.find((tag) => tag.value.startsWith('mood_'))
            if (moodTag) {
              useStoryStore.getState().setLumiMood(moodTag.value)
            }
          }

          if (!requiresManualAdvance) {
            const waitMs = computeTypingDurationMs(text) + ADVANCE_BUFFER_MS
            skippableWait(waitMs, () => cancelled).then(() => {
              if (!cancelled) advanceOnce()
            })
          }
        }

        const onDialogue: DialogueHandler = (_interp, character, text, tags, advance) => {
          const pendingPauseMs = consumePendingPause()
          const skipPause = skipNextPauseRef.current
          skipNextPauseRef.current = false

          if (pendingPauseMs && pendingPauseMs > 0 && !skipPause) {
            skippableWait(pendingPauseMs, () => cancelled).then(() => {
              reveal(character, text, tags, advance)
            })
          } else {
            reveal(character, text, tags, advance)
          }
        }

        const onChoice: ChoiceHandler = (_interp, options, select) => {
          const pendingPauseMs = consumePendingPause()
          const skipPause = skipNextPauseRef.current
          skipNextPauseRef.current = false

          const revealChoice = () => {
            if (cancelled) return
            setChoices(options)
            selectRef.current = select
          }

          if (pendingPauseMs && pendingPauseMs > 0 && !skipPause) {
            skippableWait(pendingPauseMs, () => cancelled).then(revealChoice)
          } else {
            revealChoice()
          }
        }

        const onFinish: FinishHandler = () => {
          setFinished(true)
        }

        Loreline.play(script, onDialogue, onChoice, onFinish, startBeat, {
          functions: lorelineFunctions,
        })

        setLoading(false)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [scriptUrl, startBeat])

  return {
    line,
    choices,
    awaitingManualAdvance,
    finished,
    loading,
    error,
    advance: () => {
      skipNextPauseRef.current = true
      advanceRef.current?.()
    },
    choose: (index: number) => selectRef.current?.(index),
  }
}
