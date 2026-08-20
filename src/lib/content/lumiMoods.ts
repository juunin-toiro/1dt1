// Farbtabelle aus dem LX-Blueprint (Abschnitt 9). Balu ist bewusst fix
// eingefaerbt, Lumis Farbe/Icon wechselt pro mood_*-Tag.
// Balus urspruengliches dunkles Petrol (#1E4548) hatte auf dem neuen dunklen
// Hintergrund (#12141A) nur ~1.7:1 Kontrast - deutlich unter WCAG AA. Dieser
// hellere Petrol-/Aqua-Ton behaelt die Farbfamilie, ist aber lesbar.
export const BALU_COLOR = '#5FBFC4'

// Alle bekannten Lumi-Launen. Als Union statt string, damit Tippfehler beim
// Nachschlagen (LUMI_MOODS[x]) schon beim Kompilieren auffallen, nicht erst
// zur Laufzeit im Browser.
export type LumiMoodKey =
  | 'mood_muede'
  | 'mood_gestresst'
  | 'mood_hungrig'
  | 'mood_entspannt'
  | 'mood_stolz'
  | 'mood_gluecklich'
  | 'mood_zuversichtlich'
  | 'mood_scham'
  | 'mood_unsicher'
  | 'mood_frust'

export interface LumiMoodDefinition {
  key: LumiMoodKey
  /** Deutsches Label, z.B. fuer das Dev-Panel oder Tooltips. */
  label: string
  /** Hex-Farbe - faerbt Lumis Namen im Fliesstext und (bei Bedarf) Choices. */
  color: string
  /** Dieselbe Farbe als "r, g, b" - fuer Stellen, die per CSS-Variable eine
   *  variable Deckkraft brauchen (siehe choiceAccent.ts), analog zu
   *  TIME_OF_DAY_MARK_COLOR_RGB in timeOfDayColors.ts. Wird aus `color`
   *  abgeleitet, nicht separat gepflegt - keine zwei Quellen, die auseinanderlaufen koennen. */
  colorRgb: string
  /** Pfad zum Status-Bar-Icon (SVG bevorzugt). */
  iconSrc: string
  iconType: 'svg' | 'png'
  /** Alt-Text fuers <img> - trägt die Bedeutung, wenn Icon/Farbe allein nicht reichen (Screenreader, Farbenblindheit). */
  alt: string
}

function hexToRgbString(hex: string): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

interface LumiMoodSeed {
  label: string
  color: string
  /** Dateiname ohne Endung unter public/icons/lumi/. */
  file: string
}

// Einzige Quelle pro Mood: Label, Farbe, Icon-Dateiname. colorRgb/iconSrc/alt
// werden daraus abgeleitet (siehe LUMI_MOODS unten), damit nichts doppelt
// gepflegt werden muss.
const LUMI_MOOD_SEEDS: Record<LumiMoodKey, LumiMoodSeed> = {
  mood_muede: { label: 'Müde', color: '#A8A4CE', file: 'muede' },
  mood_gestresst: { label: 'Gestresst', color: '#D97757', file: 'gestresst' },
  mood_hungrig: { label: 'Hungrig', color: '#D98A47', file: 'hungrig' },
  mood_entspannt: { label: 'Entspannt', color: '#8FAE9E', file: 'entspannt' },
  mood_stolz: { label: 'Stolz', color: '#BD7484', file: 'stolz' },
  mood_gluecklich: { label: 'Glücklich', color: '#E8C468', file: 'gluecklich' },
  mood_zuversichtlich: { label: 'Zuversichtlich', color: '#A9D4E0', file: 'zuversichtlich' },
  mood_scham: { label: 'Scham', color: '#B98C8C', file: 'scham' },
  mood_unsicher: { label: 'Unsicher', color: '#7A8894', file: 'unsicher' },
  mood_frust: { label: 'Frustriert', color: '#C2604F', file: 'frust' },
}

export const LUMI_MOOD_KEYS = Object.keys(LUMI_MOOD_SEEDS) as LumiMoodKey[]

export const LUMI_MOODS: Record<LumiMoodKey, LumiMoodDefinition> = Object.fromEntries(
  LUMI_MOOD_KEYS.map((key) => {
    const seed = LUMI_MOOD_SEEDS[key]
    const definition: LumiMoodDefinition = {
      key,
      label: seed.label,
      color: seed.color,
      colorRgb: hexToRgbString(seed.color),
      iconSrc: `/icons/lumi/${seed.file}.svg`,
      iconType: 'svg',
      alt: `Lumis Laune: ${seed.label}`,
    }
    return [key, definition]
  }),
) as Record<LumiMoodKey, LumiMoodDefinition>

// Typsichere Pruefung, ob ein zur Laufzeit aus dem .lor-Skript kommender
// String (z.B. ein TextTag-Wert) tatsaechlich einer bekannten Mood entspricht
// - Loreline-Tags sind freie Strings, keine TypeScript-Union, daher braucht
// jede Stelle, die sie in LUMI_MOODS/LUMI_MOOD_COLORS nachschlagen will,
// diesen Guard, um typsicher zu bleiben (kein `as LumiMoodKey`-Cast noetig).
export function isLumiMoodKey(value: string): value is LumiMoodKey {
  return (LUMI_MOOD_KEYS as string[]).includes(value)
}

// Abwaertskompatible Ableitungen aus LUMI_MOODS - bestehender Code (choiceAccent.ts,
// DevPanel.tsx, resolveLumiMoodColor in StoryPlayer.tsx) importiert weiterhin
// diese beiden Namen, liest die Werte jetzt aber aus derselben Quelle wie
// LUMI_MOODS statt aus einer separat gepflegten Tabelle.
export const LUMI_MOOD_COLORS: Record<LumiMoodKey, string> = Object.fromEntries(
  LUMI_MOOD_KEYS.map((key) => [key, LUMI_MOODS[key].color]),
) as Record<LumiMoodKey, string>

export const LUMI_MOOD_COLORS_RGB: Record<LumiMoodKey, string> = Object.fromEntries(
  LUMI_MOOD_KEYS.map((key) => [key, LUMI_MOODS[key].colorRgb]),
) as Record<LumiMoodKey, string>

// Chef/Robin sollen sich untereinander noch unterscheiden lassen - bewusst
// dezent nur auf dem Namens-Label, nicht auf dem gesamten Text (Position im
// Fliesstext bleibt die Hauptsemantik, siehe DialogueBubble in StoryPlayer.tsx).
export const SOCIAL_VOICE_COLORS: Record<string, string> = {
  chef: '#8FA6B8',
  robin: '#B89F7A',
}
