import { useState } from 'react'
import { useStoryStore } from '../../lib/loreline/storyStore'
import { LUMI_MOOD_COLORS, isLumiMoodKey } from '../../lib/content/lumiMoods'
import { LumiMoodIcon } from './LumiMoodIcon'
import './StatusBar.css'

const TREND_ARROWS: Record<'up' | 'down' | 'flat', string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export function StatusBar() {
  const glucoseValue = useStoryStore((state) => state.glucoseValue)
  const trend = useStoryStore((state) => state.trend)
  const lumiMoodRaw = useStoryStore((state) => state.lumiMood)
  // lumiMood im Store ist ein freier String (kommt direkt aus einem
  // Loreline-Tag, siehe useLoreline.ts) - isLumiMoodKey engt ihn hier einmal
  // typsicher auf die bekannten 10 Launen ein, bevor er in LUMI_MOODS/
  // LUMI_MOOD_COLORS nachgeschlagen wird.
  const lumiMood = lumiMoodRaw && isLumiMoodKey(lumiMoodRaw) ? lumiMoodRaw : null
  const unlockedKnowledge = useStoryStore((state) => state.unlockedKnowledge)
  // Getrennt von unlockedKnowledge.length (siehe storyStore.ts) - erhoeht sich
  // erst, wenn die fliegende Gluehbirne in der StatusBar "landet" (aha-Klick/
  // Escape/Backdrop im Modal), nicht schon beim Waehlen der Choice. So spielt
  // die Pop-Animation genau im Moment des Uebernehmens, nicht vorzeitig.
  const knowledgeBadgePulse = useStoryStore((state) => state.knowledgeBadgePulse)
  // Sichtbares/vorlesbares Gegenstueck zu jedem playSound()/playAmbience()
  // im .lor-Skript (siehe functions.ts) - erfuellt die WCAG-Anforderung aus
  // der Blueprint-Sektion 6, dass kein Audio-Cue ohne Text-Aequivalent
  // auskommt. key=captionSeq statt caption, damit auch ein wiederholter
  // identischer Text (z.B. zweimal "Front door shuts") die Fade-Animation
  // erneut auslöst.
  const caption = useStoryStore((state) => state.caption)
  const captionSeq = useStoryStore((state) => state.captionSeq)
  // Dieselbe Uhrzeit-Quelle wie die tageszeitabhaengige Mark-Farbe in
  // StoryPlayer.tsx (zuletzt via setCurve() gesetzt) - erscheint erst, sobald
  // ein erster Wert vorliegt, analog zum Knowledge-Badge daneben.
  const latestZeit = useStoryStore((state) => state.curvePoints[state.curvePoints.length - 1]?.zeit)
  const [libraryOpen, setLibraryOpen] = useState(false)

  return (
    <div className="status-bar">
      <div className="status-bar__top">
        <div className="status-bar__row">
          {/* key spielt einen kurzen, praezisen Tick (Skalierung + Farbblitz,
              siehe StatusBar.css) bei jedem neuen Messwert ab - Balus Casino-
              Moment, aber als knapper Puls statt eines echten Ziffern-Rollens. */}
          <span key={glucoseValue ?? 'glucose-none'} className="status-bar__glucose">
            {glucoseValue !== null ? glucoseValue.toFixed(1) : '–'}
            {trend && <span className="status-bar__trend">{TREND_ARROWS[trend]}</span>}
          </span>
          {/* key sorgt fuer einen weichen Fade/Scale-Uebergang genau dann, wenn
              sich Lumis Laune tatsaechlich aendert (neuer mood_*-Tag) - nicht
              bei jeder beliebigen Dialogzeile, da lumiMood nur bei echten
              Mood-Tags ueberhaupt neu gesetzt wird (siehe useLoreline.ts). */}
          <span
            key={lumiMood ?? 'mood-none'}
            className="status-bar__mood"
            style={{ color: lumiMood ? LUMI_MOOD_COLORS[lumiMood] : undefined }}
          >
            <LumiMoodIcon moodKey={lumiMood} size={34} />
          </span>
          {unlockedKnowledge.length > 0 && (
            // key sorgt fuer einen frischen Mount bei jedem Pulse, damit die
            // Pop-Animation (kurz groesser + leuchten, siehe StatusBar.css)
            // erneut abspielt - siehe knowledgeBadgePulse oben.
            <button
              key={knowledgeBadgePulse}
              type="button"
              id="status-bar-knowledge-target"
              className="status-bar__knowledge-toggle"
              onClick={() => setLibraryOpen((open) => !open)}
              aria-expanded={libraryOpen}
            >
              💡 {unlockedKnowledge.length}
            </button>
          )}
        </div>

        {latestZeit && <span className="status-bar__time">{latestZeit}</span>}
      </div>

      {caption && (
        <span key={captionSeq} className="status-bar__caption" role="status" aria-live="polite">
          🔊 {caption}
        </span>
      )}

      {libraryOpen && unlockedKnowledge.length > 0 && (
        <div className="status-bar__knowledge-panel">
          {unlockedKnowledge.map((entry) => (
            <details key={entry.id} className="status-bar__knowledge-entry">
              <summary>{entry.title}</summary>
              <p>{entry.text}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
