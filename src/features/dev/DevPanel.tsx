import { useState } from 'react'
import { playAmbience, playSound, stopAmbience } from '../../lib/audio/audioEngine'
import { haptics } from '../../lib/haptics/haptics'
import { offerShare } from '../../lib/loreline/functions'
import { useStoryStore, type Trend } from '../../lib/loreline/storyStore'
import { LUMI_MOOD_COLORS } from '../../lib/content/lumiMoods'
import './DevPanel.css'

const TRENDS: { value: Trend; label: string }[] = [
  { value: 'up', label: '↑ steigend' },
  { value: 'down', label: '↓ fallend' },
  { value: 'flat', label: '→ stabil' },
]

export function DevPanel() {
  const [open, setOpen] = useState(false)
  const [glucoseInput, setGlucoseInput] = useState('8.4')

  const glucoseValue = useStoryStore((state) => state.glucoseValue)
  const setCurve = useStoryStore((state) => state.setCurve)
  const setLumiMood = useStoryStore((state) => state.setLumiMood)
  const unlockKnowledge = useStoryStore((state) => state.unlockKnowledge)
  const revealCurve = useStoryStore((state) => state.revealCurve)

  if (!import.meta.env.DEV) {
    return null
  }

  const applyTrend = (trend: Trend) => {
    const value = Number(glucoseInput)
    setCurve(Number.isNaN(value) ? (glucoseValue ?? 8) : value, trend, 'debug')
  }

  return (
    <div className="dev-panel">
      <button type="button" className="dev-panel__toggle" onClick={() => setOpen((o) => !o)}>
        🛠️ Dev{open ? ' ▾' : ''}
      </button>

      {open && (
        <div className="dev-panel__body">
          <section className="dev-panel__section">
            <h3>Audio</h3>
            <button type="button" onClick={() => playSound('pen_click')}>
              playSound("click")
            </button>
            <button type="button" onClick={() => playAmbience('morning-room')}>
              playAmbience("morning-room")
            </button>
            <button type="button" onClick={() => stopAmbience()}>
              stopAmbience()
            </button>
          </section>

          <section className="dev-panel__section">
            <h3>Wissen &amp; Kurve</h3>
            <button
              type="button"
              onClick={() => unlockKnowledge('diabetes', 'Was ist Diabetes?', 'Diabetes bedeutet, dass der Koerper den Blutzuckerspiegel nicht mehr von selbst regulieren kann.')}
            >
              unlockKnowledge("diabetes")
            </button>
            <button type="button" onClick={() => revealCurve()}>
              revealDayCurve()
            </button>
            <button type="button" onClick={() => offerShare()}>
              offerShare()
            </button>
          </section>

          <section className="dev-panel__section">
            <h3>Glukose / Trend</h3>
            <input
              type="number"
              step="0.1"
              value={glucoseInput}
              onChange={(e) => setGlucoseInput(e.target.value)}
              className="dev-panel__input"
            />
            <div className="dev-panel__row">
              {TRENDS.map((trend) => (
                <button key={trend.value} type="button" onClick={() => applyTrend(trend.value)}>
                  {trend.label}
                </button>
              ))}
            </div>
          </section>

          <section className="dev-panel__section">
            <h3>Lumis Mood</h3>
            <div className="dev-panel__row">
              {Object.keys(LUMI_MOOD_COLORS).map((mood) => (
                <button key={mood} type="button" onClick={() => setLumiMood(mood)}>
                  {mood.replace('mood_', '')}
                </button>
              ))}
            </div>
          </section>

          <section className="dev-panel__section">
            <h3>Haptik</h3>
            <button type="button" onClick={() => haptics.choiceTap()}>
              choiceTap
            </button>
            <button type="button" onClick={() => haptics.reveal()}>
              reveal
            </button>
            <button type="button" onClick={() => haptics.warning()}>
              warning
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
