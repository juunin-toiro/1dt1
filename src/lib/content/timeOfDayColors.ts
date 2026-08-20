// Ordnet die Uhrzeit-Strings aus den setCurve()-Aufrufen im .lor-Skript (z.B.
// "04:00") einer von vier Tageszeit-Stimmungen zu, die die Farbe der
// Erzaehltext-Markierung (.story-mark in StoryPlayer.css) bestimmen: nachts
// und bei der naechtlichen Reflexion am Ende rot, morgens und abends orange
// (die bestehende Akzentfarbe der App), mittags/nachmittags blau.
export type TimeOfDayBucket = 'night' | 'morning' | 'midday' | 'evening'

export function resolveTimeOfDayBucket(zeit: string | undefined): TimeOfDayBucket {
  const hours = zeit ? Number(zeit.split(':')[0]) : NaN
  if (Number.isNaN(hours)) return 'midday'
  if (hours >= 22 || hours < 5) return 'night'
  if (hours < 10) return 'morning'
  if (hours < 18) return 'midday'
  return 'evening'
}

// Als "r, g, b"-Komponenten statt fertiger Farbwerte, damit die Aufrufstelle
// (.story-mark--typing/--settled) weiterhin selbst die Deckkraft bestimmt.
export const TIME_OF_DAY_MARK_COLOR_RGB: Record<TimeOfDayBucket, string> = {
  night: '196, 74, 74',
  morning: '217, 119, 87',
  midday: '90, 149, 217',
  evening: '217, 119, 87',
}
