import { useState } from 'react'
import { LUMI_MOODS, type LumiMoodKey } from '../../lib/content/lumiMoods'
import './LumiMoodIcon.css'

// ✨ ist bewusst KEIN Emoji-Fallback fuer eine fehlende Mood, sondern der
// eigenstaendige neutrale Zustand "noch keine Laune bekannt" (bevor Lumis
// erste mood_*-Zeile ueberhaupt lief) - dasselbe Icon, das auch im Fliesstext
// steht (siehe DialogueBubble), nur ohne Laune-Farbe. Ein Emoji kommt nur ins
// Spiel, wenn ein ECHTES Asset (moodKey vorhanden) beim Laden fehlschlaegt.
const NEUTRAL_LABEL = 'Lumi: noch keine erkennbare Laune'

export interface LumiMoodIconProps {
  moodKey: LumiMoodKey | null
  /** Kantenlaenge in px - bewusst grosszuegig genug fuer Touch-/Lesbarkeits-
   *  Ansprueche, nicht auf Emoji-Schriftgroesse begrenzt. */
  size?: number
}

// Rendert Lumis Laune-Icon in der StatusBar als echtes Bild-Asset (SVG,
// PNG-Pfad waere ebenso moeglich, siehe LumiMoodDefinition.iconType) statt
// als Unicode-Emoji. Jede Mood hat eine eigene, unterschiedlich gezeichnete
// Illustration (nicht nur eine andere Farbe auf derselben Form) - die
// Unterscheidung haengt dadurch nie an Farbe allein, siehe alt-Text fuer
// Screenreader.
export function LumiMoodIcon({ moodKey, size = 28 }: LumiMoodIconProps) {
  const [assetFailed, setAssetFailed] = useState(false)

  if (!moodKey) {
    return (
      <span
        className="lumi-mood-icon lumi-mood-icon--neutral"
        style={{ width: size, height: size, fontSize: size * 0.75 }}
        role="img"
        aria-label={NEUTRAL_LABEL}
      >
        ✨
      </span>
    )
  }

  const mood = LUMI_MOODS[moodKey]

  if (assetFailed) {
    return (
      <span
        className="lumi-mood-icon lumi-mood-icon--fallback"
        style={{ width: size, height: size, fontSize: size * 0.75 }}
        role="img"
        aria-label={mood.alt}
      >
        ✨
      </span>
    )
  }

  return (
    <img
      key={moodKey}
      src={mood.iconSrc}
      alt={mood.alt}
      width={size}
      height={size}
      className="lumi-mood-icon"
      draggable={false}
      onError={() => setAssetFailed(true)}
    />
  )
}
