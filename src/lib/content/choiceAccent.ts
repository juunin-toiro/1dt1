import { LUMI_MOOD_COLORS_RGB, isLumiMoodKey } from './lumiMoods'

// Zentrale Fallback-Logik fuer die Choice-Akzentfarbe (Text + `>`-Icon):
// ist gerade ein Lumi-Mood aktiv, uebernimmt die Choice dessen Farbe (die
// Wahlmoeglichkeiten wirken dann wie ein Teil von Lumis aktueller Stimmung).
// Ohne aktiven Mood faellt die Farbe auf dieselbe Grundrichtung wie die
// Erzaehltext-Markierung zurueck (--mark-color-rgb, siehe timeOfDayColors.ts),
// statt einen dritten, unabhaengigen Farbwert einzufuehren.
export function resolveChoiceAccentRgb(lumiMood: string | null, markColorRgb: string): string {
  if (lumiMood && isLumiMoodKey(lumiMood)) return LUMI_MOOD_COLORS_RGB[lumiMood]
  return markColorRgb
}
