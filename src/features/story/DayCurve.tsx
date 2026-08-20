import { useStoryStore } from '../../lib/loreline/storyStore'
import './DayCurve.css'

const WIDTH = 600
const HEIGHT = 160
const PADDING = 28

function parseMinutes(zeit: string): number {
  const [hours, minutes] = zeit.split(':').map(Number)
  return hours * 60 + minutes
}

export function DayCurve() {
  const curvePoints = useStoryStore((state) => state.curvePoints)
  const curveVisible = useStoryStore((state) => state.curveVisible)

  if (!curveVisible || curvePoints.length < 2) {
    return null
  }

  const minutes = curvePoints.map((point) => parseMinutes(point.zeit))
  const values = curvePoints.map((point) => point.value)

  const minMinutes = Math.min(...minutes)
  const maxMinutes = Math.max(...minutes)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  const minutesRange = maxMinutes - minMinutes || 1
  const valueRange = maxValue - minValue || 1

  const toX = (m: number) => PADDING + ((m - minMinutes) / minutesRange) * (WIDTH - 2 * PADDING)
  const toY = (v: number) => HEIGHT - PADDING - ((v - minValue) / valueRange) * (HEIGHT - 2 * PADDING)

  const linePoints = curvePoints
    .map((point) => `${toX(parseMinutes(point.zeit))},${toY(point.value)}`)
    .join(' ')

  return (
    <div className="day-curve">
      <p className="day-curve__title">Deine Glukosekurve von heute</p>
      <svg
        className="day-curve__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Glukosekurve des Tages, von morgens bis jetzt"
      >
        <polyline points={linePoints} className="day-curve__line" />
        {curvePoints.map((point, index) => (
          <circle
            key={index}
            cx={toX(parseMinutes(point.zeit))}
            cy={toY(point.value)}
            r={2.5}
            className="day-curve__dot"
          />
        ))}
      </svg>
      <div className="day-curve__labels">
        <span>{curvePoints[0].zeit}</span>
        <span>{curvePoints[curvePoints.length - 1].zeit}</span>
      </div>
    </div>
  )
}
