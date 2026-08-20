import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface TypewriterResult {
  visibleText: string
  done: boolean
  skip: () => void
}

// Enthuellt Text zeichenweise ueber `durationMs` - dieselbe Dauer, die auch
// den Autoplay-Timer in pacing.ts steuert. skip() zeigt den Rest sofort an,
// ohne den Autoplay-Timer selbst zu beeinflussen.
//
// Kein `active`-Flag mehr (anders als in frueheren Versionen): der einzige
// Aufrufer (StoryStage) rendert immer genau die eine aktuell laufende Zeile
// und wird dafuer pro Zeile neu gemountet (key={entry.id}) - der Hook selbst
// muss "aktiv oder vergangen" also nicht mehr unterscheiden.
export function useTypewriter(text: string, durationMs: number): TypewriterResult {
  const characters = useMemo(() => Array.from(text), [text])
  const [visibleCount, setVisibleCount] = useState(0)
  const skippedRef = useRef(false)

  useEffect(() => {
    skippedRef.current = false

    const start = performance.now()
    let frame: number

    const tick = (now: number) => {
      if (skippedRef.current) return
      const progress = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs)
      setVisibleCount(Math.ceil(progress * characters.length))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [characters, durationMs])

  const skip = useCallback(() => {
    skippedRef.current = true
    setVisibleCount(characters.length)
  }, [characters])

  return {
    visibleText: characters.slice(0, visibleCount).join(''),
    done: visibleCount >= characters.length,
    skip,
  }
}
