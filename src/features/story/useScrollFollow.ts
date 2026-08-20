import { useCallback, useRef } from 'react'

const SCROLLABLE_CLASS = 'is-scrollable'

// Haelt einen Scroll-Container an einem Ende verankert, sobald sich sein
// Inhalt oder er selbst in der Groesse aendert, und markiert ihn nur dann als
// "is-scrollable" (fuer das CSS-Fade-Masking in StoryPlayer.css), wenn der
// Inhalt tatsaechlich ueber den sichtbaren Bereich hinausgeht. Ohne diese
// Unterscheidung wuerde die Fade-Maske bei kurzem Inhalt (z.B. genau einer
// Zeile, die ungefaehr genauso hoch ist wie die Fade-Distanz) den gesamten
// sichtbaren Text anblassen statt nur echten, weggescrollten Inhalt auszublenden.
//
// anchor='end' (Verlauf): immer die neuesten Zeilen zeigen, aeltere duerfen
// nach oben aus dem Sichtfeld wandern.
// anchor='start' (aktuelle Buehne): die Frage/der Text bleibt IMMER oben
// sichtbar verankert - falls Frage+Choices zusammen nicht in die max-height
// passen, wandern die UNTEREN Choices aus dem Sichtfeld statt der Frage.
// Vorher pinnte auch die Buehne ans Ende, wodurch die Frage bei jedem
// Resize-Event waehrend der Choices-Aufklapp-Transition kurz komplett aus dem
// sichtbaren Bereich geschoben wurde (der Frage-Text kam erst zurueck, wenn
// eine neue Zeile den Container frisch mountete) - live per scrollTop/
// scrollHeight/clientHeight nachgewiesen.
export function useScrollFollow(anchor: 'start' | 'end' = 'end') {
  const observerRef = useRef<ResizeObserver | null>(null)

  return useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!node) return

      const content = node.firstElementChild
      if (!content) return

      const sync = () => {
        node.scrollTop = anchor === 'end' ? node.scrollHeight : 0
        node.classList.toggle(SCROLLABLE_CLASS, content.scrollHeight > node.clientHeight + 1)
      }

      const observer = new ResizeObserver(sync)
      observer.observe(content)
      observer.observe(node)
      observerRef.current = observer
    },
    [anchor],
  )
}
